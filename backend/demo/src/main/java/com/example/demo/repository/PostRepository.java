package com.example.demo.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.demo.model.Post;

public interface PostRepository
        extends MongoRepository<Post, String> {
}