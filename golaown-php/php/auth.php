<?php
// auth.php - API endpoint for registration and login
ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    require_once 'db.php';
    $method = $_SERVER['REQUEST_METHOD'];
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($method !== 'POST') {
        throw new Exception("Method not allowed");
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data && $action !== 'logout') {
        throw new Exception("Invalid JSON data provided");
    }

    if ($action === 'register') {
        registerUser($pdo, $data);
    } elseif ($action === 'login') {
        loginUser($pdo, $data);
    } elseif ($action === 'forgot-password') {
        // Placeholder for password reset logic
        echo json_encode(['success' => true, 'message' => 'Reset link sent if email exists']);
    } else {
        throw new Exception("Invalid action: $action");
    }

} catch (Exception $e) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function registerUser($pdo, $data) {
    if (empty($data['email']) || empty($data['password'])) {
        throw new Exception("Email and password are required");
    }

    $email = sanitize($data['email']);
    $password = password_hash($data['password'], PASSWORD_DEFAULT);
    $firstName = sanitize($data['firstName'] ?? '');
    $lastName = sanitize($data['lastName'] ?? '');

    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        throw new Exception("User already exists");
    }

    // Insert user
    $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)");
    $stmt->execute([$firstName, $lastName, $email, $password]);
    
    $userId = $pdo->lastInsertId();
    
    ob_clean();
    echo json_encode([
        'success' => true, 
        'user' => [
            'id' => $userId,
            'email' => $email,
            'firstName' => $firstName,
            'lastName' => $lastName
        ]
    ]);
}

function loginUser($pdo, $data) {
    if (empty($data['email']) || empty($data['password'])) {
        throw new Exception("Email and password are required");
    }

    $email = sanitize($data['email']);
    $password = $data['password'];

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        throw new Exception("Invalid email or password");
    }

    ob_clean();
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'role' => $user['role'] ?? 'user'
        ]
    ]);
}
