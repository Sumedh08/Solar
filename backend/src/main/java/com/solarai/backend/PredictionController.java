package com.solarai.backend;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;

import java.util.Map;

@RestController
@RequestMapping("/api/prediction")
@CrossOrigin(origins = "*")
public class PredictionController {

    private final WebClient webClient;

    public PredictionController(WebClient.Builder webClientBuilder) {
        String mlUrl = System.getenv("ML_SERVICE_URL");
        if (mlUrl == null || mlUrl.isEmpty()) {
            mlUrl = "https://solar-ai-ml.onrender.com";
        }
        this.webClient = webClientBuilder.baseUrl(mlUrl).build();
    }

    @PostMapping("/generate")
    public Mono<String> predictGeneration(@RequestBody Map<String, Object> request) {
        return webClient.post()
                .uri("/predict/energy")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(String.class);
    }

    @PostMapping(value = "/custom", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<String> predictCustomGeneration(@RequestPart("file") MultipartFile file) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "data.csv";
                }
            });

            return webClient.post()
                    .uri("/predict/custom_energy")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class);
        } catch (Exception e) {
            return Mono.just("{\"error\": \"Error reading file for proxy\"}");
        }
    }
}
