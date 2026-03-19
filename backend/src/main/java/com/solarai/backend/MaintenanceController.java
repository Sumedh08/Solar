package com.solarai.backend;

import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/maintenance")
@CrossOrigin(origins = "*")
public class MaintenanceController {

    private final WebClient webClient;

    public MaintenanceController(WebClient.Builder webClientBuilder) {
        String mlUrl = System.getenv("ML_SERVICE_URL");
        if (mlUrl == null || mlUrl.isEmpty()) {
            mlUrl = "http://localhost:8000";
        }
        this.webClient = webClientBuilder.baseUrl(mlUrl).build();
    }

    @PostMapping(value = "/detect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<String> detectDefect(@RequestPart("file") Mono<FilePart> filePartMono) {
        return filePartMono.flatMap(filePart -> webClient.post()
                .uri("/predict/defect")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(filePart)
                .retrieve()
                .bodyToMono(String.class));
    }
}
