package com.aurorarain.demo.service;

import com.aurorarain.demo.domain.DetectionResult;
import org.springframework.stereotype.Service;

@Service
public class MockInferenceService {
    private static final String[] CATEGORIES = {"划痕", "磕碰", "缺料", "污渍", "毛刺"};

    public DetectionResult inspect(byte[] content) {
        int seed = content.length == 0 ? 0 : Byte.toUnsignedInt(content[0]);
        boolean ok = seed % 4 == 0;
        if (ok) {
            return new DetectionResult("OK", "无缺陷", 0.96, 0, 0, 0, 0,
                    18 + seed % 16, "mock-v1", false, "");
        }

        double x = 10 + seed % 28;
        double y = 12 + seed % 24;
        double width = 24 + seed % 20;
        double height = 18 + seed % 18;
        double confidence = Math.round((0.72 + (seed % 24) / 100.0) * 100.0) / 100.0;
        return new DetectionResult("NG", CATEGORIES[seed % CATEGORIES.length], confidence,
                x, y, width, height, 22 + seed % 31, "mock-v1", false, "");
    }
}
