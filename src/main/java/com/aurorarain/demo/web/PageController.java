package com.aurorarain.demo.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
    @GetMapping({"/docs", "/docs/"})
    public String developmentDocs() {
        return "forward:/docs/index.html";
    }
}
