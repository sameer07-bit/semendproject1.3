package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Generates a vector embedding (768 dimensions) for the given text.
     * Returns null if embedding generation fails.
     */
    public float[] getEmbedding(String text) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            System.err.println("Gemini API key is invalid or not set. Embedding generation skipped.");
            return null;
        }
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        try {
            // Standardize text length to stay within embedding model limits if necessary
            String truncatedText = text.length() > 8000 ? text.substring(0, 8000) : text;

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=" + apiKey;

            // Build payload: { "model": "models/gemini-embedding-2", "content": { "parts": [{ "text": "..." }] } }
            ObjectNode rootNode = objectMapper.createObjectNode();
            rootNode.put("model", "models/gemini-embedding-2");
            ObjectNode contentNode = rootNode.putObject("content");
            contentNode.putArray("parts").addObject().put("text", truncatedText);

            String requestBody = objectMapper.writeValueAsString(rootNode);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("Failed to fetch embedding from Gemini. HTTP Status: " + response.statusCode() + " Body: " + response.body());
                return null;
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            JsonNode valuesNode = responseJson.path("embedding").path("values");

            if (valuesNode.isArray()) {
                float[] embedding = new float[valuesNode.size()];
                for (int i = 0; i < valuesNode.size(); i++) {
                    embedding[i] = (float) valuesNode.get(i).asDouble();
                }
                return embedding;
            }
        } catch (Exception e) {
            System.err.println("Exception occurred while generating embedding: " + e.getMessage());
        }
        return null;
    }
}
