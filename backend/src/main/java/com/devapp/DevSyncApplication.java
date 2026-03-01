package com.devapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DevSyncApplication {
    public static void main(String[] args) {
        SpringApplication.run(DevSyncApplication.class, args);
    }
}
