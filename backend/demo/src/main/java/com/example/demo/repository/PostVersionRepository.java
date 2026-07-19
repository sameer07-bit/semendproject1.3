package com.example.demo.repository;

import com.example.demo.model.PostVersion;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PostVersionRepository extends MongoRepository<PostVersion, String> {
    List<PostVersion> findByPostIdOrderByVersionNumberDesc(String postId);
}
