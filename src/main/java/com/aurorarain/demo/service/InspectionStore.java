package com.aurorarain.demo.service;

import com.aurorarain.demo.domain.DetectionResult;
import com.aurorarain.demo.domain.InspectionBatch;
import com.aurorarain.demo.domain.InspectionImage;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class InspectionStore {
    private final Path root;
    private final Path uploads;
    private final Path stateFile;
    private final ObjectMapper objectMapper;
    private final MockInferenceService inferenceService;
    private final Map<String, InspectionBatch> batches = new LinkedHashMap<>();

    public InspectionStore(
            @Value("${demo.data-dir}") String dataDirectory,
            ObjectMapper objectMapper,
            MockInferenceService inferenceService
    ) throws IOException {
        this.root = Path.of(dataDirectory).toAbsolutePath().normalize();
        this.uploads = root.resolve("uploads");
        this.stateFile = root.resolve("state.json");
        this.objectMapper = objectMapper;
        this.inferenceService = inferenceService;
        Files.createDirectories(uploads);
        load();
    }

    public synchronized List<InspectionBatch> list() {
        return batches.values().stream()
                .sorted(Comparator.comparing(InspectionBatch::createdAt).reversed())
                .toList();
    }

    public synchronized Optional<InspectionBatch> find(String id) {
        return Optional.ofNullable(batches.get(id));
    }

    public synchronized void delete(String id) throws IOException {
        InspectionBatch batch = requireBatch(id);
        for (InspectionImage image : batch.images()) {
            Path target = uploads.resolve(image.storedName()).normalize();
            if (target.startsWith(uploads)) Files.deleteIfExists(target);
        }
        batches.remove(id);
        save();
    }

    public synchronized InspectionBatch create(String name, String partNumber, String scene, String note) throws IOException {
        InspectionBatch batch = new InspectionBatch(
                shortId(), name.trim(), clean(partNumber), scene.trim(), clean(note), Instant.now(), List.of());
        batches.put(batch.id(), batch);
        save();
        return batch;
    }

    public synchronized List<InspectionImage> addImages(String batchId, MultipartFile[] files) throws Exception {
        InspectionBatch batch = requireBatch(batchId);
        List<InspectionImage> next = new ArrayList<>(batch.images());
        List<InspectionImage> added = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String originalName = Optional.ofNullable(file.getOriginalFilename()).orElse("image");
            String extension = extensionOf(originalName);
            String storedName = batchId + "-" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path target = uploads.resolve(storedName).normalize();
            if (!target.startsWith(uploads)) throw new IllegalArgumentException("非法文件名");

            byte[] bytes = file.getBytes();
            Files.write(target, bytes);
            InspectionImage image = new InspectionImage(
                    shortId(), originalName, storedName, bytes.length, sha256(bytes), Instant.now(),
                    inferenceService.inspect(bytes));
            next.add(image);
            added.add(image);
        }

        batches.put(batchId, batch.withImages(next));
        save();
        return added;
    }

    public synchronized InspectionImage review(
            String batchId,
            String imageId,
            String status,
            String category,
            String note
    ) throws IOException {
        InspectionBatch batch = requireBatch(batchId);
        List<InspectionImage> next = new ArrayList<>();
        InspectionImage updated = null;
        for (InspectionImage image : batch.images()) {
            if (image.id().equals(imageId)) {
                DetectionResult result = image.result().reviewedAs(status, category, note);
                updated = image.withResult(result);
                next.add(updated);
            } else {
                next.add(image);
            }
        }
        if (updated == null) throw new IllegalArgumentException("图片不存在");
        batches.put(batchId, batch.withImages(next));
        save();
        return updated;
    }

    public Resource imageResource(String storedName) throws Exception {
        Path target = uploads.resolve(storedName).normalize();
        if (!target.startsWith(uploads) || !Files.exists(target)) {
            throw new IllegalArgumentException("文件不存在");
        }
        return new UrlResource(target.toUri());
    }

    private InspectionBatch requireBatch(String id) {
        InspectionBatch batch = batches.get(id);
        if (batch == null) throw new IllegalArgumentException("批次不存在");
        return batch;
    }

    private void load() throws IOException {
        if (!Files.exists(stateFile)) return;
        List<InspectionBatch> saved = objectMapper.readValue(stateFile.toFile(), new TypeReference<>() {});
        saved.forEach(batch -> batches.put(batch.id(), batch));
    }

    private void save() throws IOException {
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(stateFile.toFile(), batches.values());
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private static String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0) return ".bin";
        String extension = name.substring(dot).toLowerCase();
        return extension.matches("\\.(jpg|jpeg|png|webp)") ? extension : ".bin";
    }

    private static String sha256(byte[] bytes) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(digest.digest(bytes));
    }
}
