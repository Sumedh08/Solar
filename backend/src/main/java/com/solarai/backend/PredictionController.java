package com.solarai.backend;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/prediction")
@CrossOrigin(origins = "*")
public class PredictionController {

    private final WebClient webClient;

    public PredictionController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("http://localhost:8000").build();
    }

    @PostMapping("/generate")
    public Mono<String> predictGeneration(@RequestBody Map<String, Object> request) {
        return webClient.post()
                .uri("/predict/generation")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(String.class);
    }
}
