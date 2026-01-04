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
        this.webClient = webClientBuilder.baseUrl("http://localhost:8000").build();
    }

    @PostMapping(value = "/detect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<String> detectDefect(@RequestPart("file") Mono<FilePart> filePartMono) {
        return filePartMono.flatMap(filePart -> webClient.post()
                .uri("/predict/maintenance")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(filePart) // This might need proper multipart body construction
                .retrieve()
                .bodyToMono(String.class));
    }
}
