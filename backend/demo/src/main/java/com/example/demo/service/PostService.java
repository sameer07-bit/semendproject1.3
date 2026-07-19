package com.example.demo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Post;
import com.example.demo.model.PostVersion;
import com.example.demo.repository.PostRepository;
import com.example.demo.repository.PostVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostVersionRepository postVersionRepository;

    @Autowired
    private GeminiService geminiService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Saves a new post and generates its embedding.
     */
    public Post savePost(Post post) {
        // Generate embedding for the new post
        try {
            String textToEmbed = (post.getTitle() != null ? post.getTitle() : "") + " " +
                                 (post.getContent() != null ? post.getContent() : "");
            float[] vector = geminiService.getEmbedding(textToEmbed);
            if (vector != null) {
                post.setEmbedding(objectMapper.writeValueAsString(vector));
            }
        } catch (Exception e) {
            System.err.println("Error generating embedding during save: " + e.getMessage());
        }
        return postRepository.save(post);
    }

    /**
     * Updates an existing post, saving the original state to the version history if changed.
     */
    public Post updatePost(String id, Post updatedPost) {
        Optional<Post> existingOpt = postRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new IllegalArgumentException("Post not found with id: " + id);
        }

        Post existing = existingOpt.get();

        // Check if there are changes worth saving to history
        boolean hasChanged = !compareStrings(existing.getTitle(), updatedPost.getTitle()) ||
                             !compareStrings(existing.getContent(), updatedPost.getContent()) ||
                             !compareStrings(existing.getCategory(), updatedPost.getCategory()) ||
                             !compareStrings(existing.getStatus(), updatedPost.getStatus()) ||
                             !compareStrings(existing.getCoverImage(), updatedPost.getCoverImage());

        if (hasChanged) {
            // Retrieve latest version number
            List<PostVersion> versions = postVersionRepository.findByPostIdOrderByVersionNumberDesc(id);
            int nextVersionNum = versions.isEmpty() ? 1 : versions.get(0).getVersionNumber() + 1;

            // Save historical version
            PostVersion history = new PostVersion(
                    existing.getId(),
                    nextVersionNum,
                    existing.getTitle(),
                    existing.getContent(),
                    existing.getCategory(),
                    existing.getStatus(),
                    existing.getCoverImage()
            );
            postVersionRepository.save(history);
        }

        // Apply new values
        existing.setTitle(updatedPost.getTitle());
        existing.setContent(updatedPost.getContent());
        existing.setCategory(updatedPost.getCategory());
        existing.setStatus(updatedPost.getStatus());
        existing.setCoverImage(updatedPost.getCoverImage());
        existing.setIsPrivate(updatedPost.getIsPrivate() != null ? updatedPost.getIsPrivate() : false);
        if (updatedPost.getAuthorEmail() != null) {
            existing.setAuthorEmail(updatedPost.getAuthorEmail());
        }

        // Re-generate embedding
        try {
            String textToEmbed = (existing.getTitle() != null ? existing.getTitle() : "") + " " +
                                 (existing.getContent() != null ? existing.getContent() : "");
            float[] vector = geminiService.getEmbedding(textToEmbed);
            if (vector != null) {
                existing.setEmbedding(objectMapper.writeValueAsString(vector));
            }
        } catch (Exception e) {
            System.err.println("Error generating embedding during update: " + e.getMessage());
        }

        return postRepository.save(existing);
    }

    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    public void deletePost(String id) {
        postRepository.deleteById(id);
    }

    public void deletePostWithRBAC(String id, String email, String role) {
        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            throw new IllegalArgumentException("Post not found with id: " + id);
        }
        Post post = postOpt.get();
        // RBAC Check: Only admin or the post author can delete a post
        if ("ADMIN".equalsIgnoreCase(role) || (post.getAuthorEmail() != null && post.getAuthorEmail().equalsIgnoreCase(email))) {
            postRepository.deleteById(id);
        } else {
            throw new SecurityException("Unauthorized: You do not have permission to delete this manuscript");
        }
    }

    public Post updatePostWithRBAC(String id, Post updatedPost, String email, String role) {
        Optional<Post> postOpt = postRepository.findById(id);
        if (postOpt.isEmpty()) {
            throw new IllegalArgumentException("Post not found with id: " + id);
        }
        Post post = postOpt.get();
        // RBAC Check: Only admin or the post author can update a post
        if ("ADMIN".equalsIgnoreCase(role) || (post.getAuthorEmail() != null && post.getAuthorEmail().equalsIgnoreCase(email))) {
            return updatePost(id, updatedPost);
        } else {
            throw new SecurityException("Unauthorized: You do not have permission to edit this manuscript");
        }
    }

    public List<PostVersion> getVersionsByPostId(String postId) {
        return postVersionRepository.findByPostIdOrderByVersionNumberDesc(postId);
    }

    /**
     * Performs semantic search using cosine similarity of embeddings.
     */
    public List<Post> searchPosts(String query, String userEmail) {
        if (query == null || query.trim().isEmpty()) {
            return getVisiblePosts(userEmail);
        }

        // Generate query embedding
        float[] queryVector = geminiService.getEmbedding(query);

        // Fetch all posts that should be visible to this context
        List<Post> candidates = getVisiblePosts(userEmail);

        if (queryVector == null) {
            // Fallback to keyword-based match
            System.err.println("Gemini embedding offline. Falling back to keyword search.");
            String lowerQuery = query.toLowerCase();
            return candidates.stream()
                    .filter(p -> (p.getTitle() != null && p.getTitle().toLowerCase().contains(lowerQuery)) ||
                                 (p.getContent() != null && p.getContent().toLowerCase().contains(lowerQuery)))
                    .peek(p -> p.setSimilarity(1.0)) // generic similarity score
                    .toList();
        }

        List<Post> results = new ArrayList<>();
        for (Post post : candidates) {
            float[] postVector = null;
            // Backfill embedding if missing but post has content
            if (post.getEmbedding() == null || post.getEmbedding().isEmpty()) {
                if (post.getContent() != null && !post.getContent().trim().isEmpty()) {
                    try {
                        String textToEmbed = (post.getTitle() != null ? post.getTitle() : "") + " " + post.getContent();
                        postVector = geminiService.getEmbedding(textToEmbed);
                        if (postVector != null) {
                            post.setEmbedding(objectMapper.writeValueAsString(postVector));
                            postRepository.save(post);
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to backfill embedding: " + e.getMessage());
                    }
                }
            } else {
                try {
                    postVector = objectMapper.readValue(post.getEmbedding(), float[].class);
                } catch (Exception e) {
                    System.err.println("Error parsing embedding for post: " + post.getId());
                }
            }

            if (postVector != null) {
                double similarity = cosineSimilarity(queryVector, postVector);
                post.setSimilarity(similarity);
                results.add(post);
            } else {
                // If embedding is not available, set low similarity
                post.setSimilarity(0.0);
                results.add(post);
            }
        }

        // Sort by similarity descending
        results.sort(Comparator.comparingDouble(Post::getSimilarity).reversed());
        return results;
    }

    /**
     * Helper to retrieve posts visible in a given context (either public published, or owner's posts).
     */
    public List<Post> getVisiblePosts(String userEmail) {
        List<Post> allPosts = postRepository.findAll();
        // If userEmail is provided, we return:
        // 1. All posts owned by this user.
        // 2. All public published posts (not private, status is Published).
        // If userEmail is null/empty, we return only public published posts.
        return allPosts.stream()
                .filter(post -> {
                    boolean isOwner = userEmail != null && !userEmail.trim().isEmpty() &&
                                      userEmail.equalsIgnoreCase(post.getAuthorEmail());
                    boolean isPublicPublished = "Published".equalsIgnoreCase(post.getStatus()) &&
                                                (post.getIsPrivate() == null || !post.getIsPrivate());
                    return isOwner || isPublicPublished;
                })
                .toList();
    }

    private boolean compareStrings(String s1, String s2) {
        if (s1 == null && s2 == null) return true;
        if (s1 == null || s2 == null) return false;
        return s1.equals(s2);
    }

    private double cosineSimilarity(float[] vectorA, float[] vectorB) {
        if (vectorA == null || vectorB == null || vectorA.length != vectorB.length) {
            return 0.0;
        }
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += Math.pow(vectorA[i], 2);
            normB += Math.pow(vectorB[i], 2);
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}