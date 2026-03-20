package com.solarai.backend;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.core.io.ByteArrayResource;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/maintenance")
@CrossOrigin(origins = "*")
public class MaintenanceController {

    private final WebClient webClient;

    public MaintenanceController(WebClient.Builder webClientBuilder) {
        String mlUrl = System.getenv("ML_SERVICE_URL");
        if (mlUrl == null || mlUrl.isEmpty()) {
            mlUrl = "https://solar-ai-ml.onrender.com";
        }
        this.webClient = webClientBuilder.baseUrl(mlUrl).build();
    }

    @PostMapping(value = "/detect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<String> detectDefect(@RequestParam("file") MultipartFile file) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg";
                }
            });

            return webClient.post()
                    .uri("/predict/defect")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class);
        } catch (Exception e) {
            return Mono.just("{\"error\": \"Error proxying image file: " + e.getMessage() + "\"}");
        }
    }
}
