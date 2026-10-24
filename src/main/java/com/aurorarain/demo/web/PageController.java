package com.aurorarain.demo.web;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
    @GetMapping({"/docs", "/docs/"})
    public String developmentDocs() {
        return "forward:/docs/index.html";
    }

    @GetMapping("/docs/development.md")
    public ResponseEntity<Resource> developmentMarkdown() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/markdown;charset=UTF-8"))
                .body(new ClassPathResource("static/docs/开发文档.md"));
    }
}
