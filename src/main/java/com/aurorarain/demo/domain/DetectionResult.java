package com.aurorarain.demo.domain;

public record DetectionResult(
        String status,
        String category,
        double confidence,
        double x,
        double y,
        double width,
        double height,
        long inferenceMs,
        String modelVersion,
        boolean reviewed,
        String reviewNote
) {
    public DetectionResult reviewedAs(String nextStatus, String nextCategory, String note) {
        return new DetectionResult(
                nextStatus,
                nextCategory,
                confidence,
                x,
                y,
                width,
                height,
                inferenceMs,
                modelVersion,
                true,
                note == null ? "" : note
        );
    }
}
