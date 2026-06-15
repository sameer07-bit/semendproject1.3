package com.example.demo.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Users;
import com.example.demo.repository.UsersRepository;

@Service
public class UserService {

    @Autowired
    private UsersRepository usersRepository;

    // SAVE USER
    public Users saveUser(Users user) {
        return usersRepository.save(user);
    }

    // GET ALL USERS
    public List<Users> getAllUsers() {
        return usersRepository.findAll();
    }

    // FIND USER BY EMAIL
    public Optional<Users> findByEmail(String email) {
        return usersRepository.findFirstByEmail(email);
    }
}