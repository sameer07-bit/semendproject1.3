package com.example.demo.repository;

import com.example.demo.model.PostVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostVersionRepository extends JpaRepository<PostVersion, Long> {
    List<PostVersion> findByPostIdOrderByVersionNumberDesc(Long postId);
}
