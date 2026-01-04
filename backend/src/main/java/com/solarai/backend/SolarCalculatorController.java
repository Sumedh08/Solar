package com.solarai.backend;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/calculator")
@CrossOrigin(origins = "*")
public class SolarCalculatorController {

    private final WebClient webClient;

    public SolarCalculatorController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://developer.nrel.gov/api/pvwatts/v8.json").build();
    }

    @PostMapping("/calculate")
    public Mono<String> calculateSolar(@RequestBody Map<String, Object> request) {
        System.out.println("Received Calculator Request: " + request);
        // Extract parameters from request
        String systemCapacity = request.get("system_capacity").toString();
        String moduleType = request.get("module_type").toString();
        String losses = request.get("losses").toString();
        String arrayType = request.get("array_type").toString();
        String tilt = request.get("tilt").toString();
        String azimuth = request.get("azimuth").toString();
        String lat = request.get("lat").toString();
        String lon = request.get("lon").toString();

        // API Key should be in env or config, using DEMO_KEY for now as placeholder
        String apiKey = "vzFY4Crxc3rcag4LutATSlXd6fdTxIGccqzS9M4Q";

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .queryParam("api_key", apiKey)
                        .queryParam("system_capacity", systemCapacity)
                        .queryParam("module_type", moduleType)
                        .queryParam("losses", losses)
                        .queryParam("array_type", arrayType)
                        .queryParam("tilt", tilt)
                        .queryParam("azimuth", azimuth)
                        .queryParam("lat", lat)
                        .queryParam("lon", lon)
                        .build())
                .retrieve()
                .bodyToMono(String.class);
    }
}
