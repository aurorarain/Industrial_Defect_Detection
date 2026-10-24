package com.aurorarain.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DemoApplicationTests {
	@Autowired
	private MockMvc mvc;

	@Test
	void contextLoads() {
	}

	@Test
	void servesTheCompleteDevelopmentDocumentForBrowserReading() throws Exception {
		mvc.perform(get("/docs/development.md"))
				.andExpect(status().isOk())
				.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
						.contentTypeCompatibleWith("text/markdown"))
				.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
						.string(org.hamcrest.Matchers.containsString("# 工业缺陷检测 Demo 开发文档")));
	}

	@Test
	void completesTheMinimumInspectionFlow() throws Exception {
		mvc.perform(get("/api/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"));

		String batchJson = mvc.perform(post("/api/batches")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"自动化验收批次\",\"partNumber\":\"TEST-001\",\"scene\":\"机加工金属件\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.scene").value("机加工金属件"))
				.andReturn().getResponse().getContentAsString();
		String batchId = batchJson.split("\"id\":\"")[1].split("\"")[0];

		MockMultipartFile image = new MockMultipartFile(
				"files", "sample.png", "image/png", "phase-one-test-image".getBytes());
		String imageJson = mvc.perform(multipart("/api/batches/{id}/images", batchId).file(image))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].result.modelVersion").value("mock-v1"))
				.andReturn().getResponse().getContentAsString();
		String storedName = imageJson.split("\"storedName\":\"")[1].split("\"")[0];

		mvc.perform(get("/api/batches/{id}/stats", batchId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1));

		mvc.perform(delete("/api/batches/{id}", batchId))
				.andExpect(status().isNoContent());
		mvc.perform(get("/api/batches/{id}", batchId))
				.andExpect(status().isBadRequest());
		mvc.perform(get("/api/files/{storedName}", storedName))
				.andExpect(status().isBadRequest());
	}

}
