package com.aurorarain.demo.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public record InspectionBatch(
        String id,
        String name,
        String partNumber,
        String scene,
        String note,
        Instant createdAt,
        List<InspectionImage> images
) {
    public InspectionBatch {
        images = images == null ? new ArrayList<>() : new ArrayList<>(images);
    }

    public InspectionBatch withImages(List<InspectionImage> nextImages) {
        return new InspectionBatch(id, name, partNumber, scene, note, createdAt, nextImages);
    }
}
