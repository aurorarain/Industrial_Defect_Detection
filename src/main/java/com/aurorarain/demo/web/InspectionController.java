package com.aurorarain.demo.web;

import com.aurorarain.demo.domain.InspectionBatch;
import com.aurorarain.demo.domain.InspectionImage;
import com.aurorarain.demo.service.InspectionStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class InspectionController {
    private final InspectionStore store;

    public InspectionController(InspectionStore store) {
        this.store = store;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "UP", "service", "industrial-defect-demo", "version", "0.1.0", "time", Instant.now());
    }

    @GetMapping("/batches")
    public List<InspectionBatch> listBatches() {
        return store.list();
    }

    @GetMapping("/batches/{id}")
    public InspectionBatch getBatch(@PathVariable String id) {
        return store.find(id).orElseThrow(() -> new IllegalArgumentException("批次不存在"));
    }

    @PostMapping("/batches")
    public InspectionBatch createBatch(@Valid @RequestBody BatchRequest request) throws Exception {
        return store.create(request.name(), request.partNumber(), request.note());
    }

    @PostMapping(value = "/batches/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<InspectionImage> upload(
            @PathVariable String id,
            @RequestParam("files") MultipartFile[] files
    ) throws Exception {
        return store.addImages(id, files);
    }

    @PatchMapping("/batches/{batchId}/images/{imageId}")
    public InspectionImage review(
            @PathVariable String batchId,
            @PathVariable String imageId,
            @RequestBody ReviewRequest request
    ) throws Exception {
        return store.review(batchId, imageId, request.status(), request.category(), request.note());
    }

    @GetMapping("/batches/{id}/stats")
    public Map<String, Object> stats(@PathVariable String id) {
        InspectionBatch batch = store.find(id).orElseThrow(() -> new IllegalArgumentException("批次不存在"));
        long ok = batch.images().stream().filter(image -> "OK".equals(image.result().status())).count();
        Map<String, Long> categories = new LinkedHashMap<>();
        batch.images().forEach(image -> categories.merge(image.result().category(), 1L, Long::sum));
        return Map.of("total", batch.images().size(), "ok", ok, "ng", batch.images().size() - ok, "categories", categories);
    }

    @GetMapping(value = "/batches/{id}/export", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> export(@PathVariable String id) {
        InspectionBatch batch = store.find(id).orElseThrow(() -> new IllegalArgumentException("批次不存在"));
        StringBuilder csv = new StringBuilder("文件名,判定,缺陷类别,置信度,已复核,模型版本,耗时毫秒\n");
        batch.images().forEach(image -> csv.append(csvCell(image.originalName())).append(',')
                .append(image.result().status()).append(',')
                .append(csvCell(image.result().category())).append(',')
                .append(image.result().confidence()).append(',')
                .append(image.result().reviewed() ? "是" : "否").append(',')
                .append(image.result().modelVersion()).append(',')
                .append(image.result().inferenceMs()).append('\n'));
        byte[] content = ("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename("batch-" + id + ".csv").build());
        return ResponseEntity.ok().headers(headers).body(content);
    }

    @GetMapping("/files/{storedName}")
    public ResponseEntity<Resource> image(@PathVariable String storedName) throws Exception {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(store.imageResource(storedName));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    public record BatchRequest(@NotBlank String name, String partNumber, String note) {}
    public record ReviewRequest(String status, String category, String note) {}

    private static String csvCell(String value) {
        return '"' + value.replace("\"", "\"\"") + '"';
    }
}
