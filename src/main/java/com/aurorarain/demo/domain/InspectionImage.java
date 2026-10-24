package com.aurorarain.demo.domain;

import java.time.Instant;

public record InspectionImage(
        String id,
        String originalName,
        String storedName,
        long size,
        String sha256,
        Instant uploadedAt,
        DetectionResult result
) {
    public InspectionImage withResult(DetectionResult nextResult) {
        return new InspectionImage(id, originalName, storedName, size, sha256, uploadedAt, nextResult);
    }
}
