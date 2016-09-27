# Framing Bare Bones Example

This example shows how to use Framing components to divide a command-line application into distinct sections or concerns.

## Table of Contents
- [Setup and Run](#setup-and-run)
- [Components](#components)

## Setup and Run
1. ```npm install```
2. ```npm start```

## Components
These are the components that comprise the application.

### App
This is the main component for the application.
It imports the Greeting Generator and the User Account components and prints a "Hello, World" message.

### Greeting Generator
The greeting generator component generates a random greeting.
This component uses promises for its initialization and the generator.

### User Account
The user account component returns a random user name.
This component uses callbacks for its initialization and the user name accessor.