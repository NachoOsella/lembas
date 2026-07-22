package com.dietetica.lembas.users.service;

import com.dietetica.lembas.users.api.UserDirectory;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Implements the authentication-facing user directory with users persistence. */
@Service
public class UserDirectoryService implements UserDirectory {

    private final UserRepository userRepository;

    public UserDirectoryService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public User registerCustomer(User user) {
        return userRepository.save(user);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }
}
