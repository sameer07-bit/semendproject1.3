package com.example.demo.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.demo.model.Users;

public interface UsersRepository extends MongoRepository<Users, String> {

    Optional<Users> findFirstByEmail(String email);

}