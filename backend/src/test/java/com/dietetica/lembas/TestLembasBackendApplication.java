package com.dietetica.lembas;

import org.springframework.boot.SpringApplication;

public class TestLembasBackendApplication {

	public static void main(String[] args) {
		SpringApplication.from(LembasBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
