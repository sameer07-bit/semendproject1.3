package com.example.demo.controller;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Users;
import com.example.demo.service.UserService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserService userService;

    // REGISTER
    @PostMapping("/register")
    public Users register(@RequestBody Users user) {
        return userService.saveUser(user);
    }

    // LOGIN
    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Users user) {
        Map<String, String> response = new HashMap<>();

        Optional<Users> existingUser =
                userService.findByEmail(user.getEmail());

        if (existingUser.isPresent() &&
            existingUser.get().getPassword().equals(user.getPassword())) {

            response.put("message", "Login Successful");
            response.put("name", existingUser.get().getName());
            response.put("email", existingUser.get().getEmail());
            return response;
        }

        response.put("message", "Invalid Email or Password");
        return response;
    }

    // GET USERS
    @GetMapping("/users")
    public List<Users> getUsers() {
        return userService.getAllUsers();
    }
}