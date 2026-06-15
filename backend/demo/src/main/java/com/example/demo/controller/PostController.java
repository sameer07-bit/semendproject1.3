package com.example.demo.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Post;
import com.example.demo.model.PostVersion;
import com.example.demo.service.PostService;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin("*")
public class PostController {

    @Autowired
    private PostService postService;

    @Autowired
    private jakarta.servlet.http.HttpServletRequest request;

    @PostMapping
    public Post createPost(@RequestBody Post post) {
        return postService.savePost(post);
    }

    @PutMapping("/{id}")
    public Post updatePost(@PathVariable Long id, @RequestBody Post post) {
        String email = (String) request.getAttribute("userEmail");
        String role = (String) request.getAttribute("userRole");
        return postService.updatePostWithRBAC(id, post, email, role);
    }

    @GetMapping
    public List<Post> getPosts(@RequestParam(value = "userEmail", required = false) String userEmail) {
        return postService.getVisiblePosts(userEmail);
    }

    @GetMapping("/{id}/versions")
    public List<PostVersion> getVersions(@PathVariable Long id) {
        return postService.getVersionsByPostId(id);
    }

    @GetMapping("/search")
    public List<Post> searchPosts(@RequestParam("query") String query,
                                  @RequestParam(value = "userEmail", required = false) String userEmail) {
        return postService.searchPosts(query, userEmail);
    }

    @DeleteMapping("/{id}")
    public void deletePost(@PathVariable Long id) {
        String email = (String) request.getAttribute("userEmail");
        String role = (String) request.getAttribute("userRole");
        postService.deletePostWithRBAC(id, email, role);
    }
}