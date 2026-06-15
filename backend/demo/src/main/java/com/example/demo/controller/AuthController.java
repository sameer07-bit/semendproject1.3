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

            String email = existingUser.get().getEmail();
            String name = existingUser.get().getName();
            
            response.put("message", "Login Successful");
            response.put("name", name);
            response.put("email", email);
            response.put("token", generateMockJwtToken(email, name));
            return response;
        }

        response.put("message", "Invalid Email or Password");
        return response;
    }

    private String generateMockJwtToken(String email, String name) {
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = String.format(
            "{\"sub\":\"%s\",\"name\":\"%s\",\"role\":\"ROLE_USER\",\"iat\":%d}",
            email, name, System.currentTimeMillis() / 1000
        );
        
        java.util.Base64.Encoder encoder = java.util.Base64.getUrlEncoder().withoutPadding();
        String encodedHeader = encoder.encodeToString(header.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String encodedPayload = encoder.encodeToString(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        
        String encodedSignature = encoder.encodeToString("mock_secret_signature_key_semendproject".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        
        return encodedHeader + "." + encodedPayload + "." + encodedSignature;
    }

    // GET USERS
    @GetMapping("/users")
    public List<Users> getUsers() {
        return userService.getAllUsers();
    }
}