package com.example.demo.controller;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.Users;
import com.example.demo.service.UserService;
import com.example.demo.service.JwtUtil;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    // REGISTER
    @PostMapping("/register")
    public Users register(@RequestBody Users user) {
        if (user.getRole() == null || user.getRole().trim().isEmpty()) {
            user.setRole("USER");
        }
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

            Users dbUser = existingUser.get();
            String token = jwtUtil.generateToken(dbUser.getEmail(), dbUser.getName(), dbUser.getRole());

            response.put("message", "Login Successful");
            response.put("name", dbUser.getName());
            response.put("email", dbUser.getEmail());
            response.put("token", token);
            response.put("role", dbUser.getRole());
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