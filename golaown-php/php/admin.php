<?php
// admin.php - API endpoint for administrative tasks
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    require_once 'db.php';
    $action = isset($_GET['action']) ? $_GET['action'] : 'stats';

    // Simple security check - in production, use session/JWT
    // For now, we assume the frontend handles basic auth check

    if ($action === 'stats') {
        getStats($pdo);
    } elseif ($action === 'orders') {
        getOrders($pdo);
    } elseif ($action === 'users') {
        getUsers($pdo);
    } elseif ($action === 'categories') {
        getCategories($pdo);
    } else {
        throw new Exception("Invalid action");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function getStats($pdo) {
    // Total Revenue
    $stmt = $pdo->query("SELECT SUM(total_amount) as revenue FROM orders WHERE status != 'Cancelled'");
    $revenue = $stmt->fetch()['revenue'] ?? 0;

    // Total Orders
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM orders");
    $orderCount = $stmt->fetch()['count'] ?? 0;

    // Total Customers
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $customerCount = $stmt->fetch()['count'] ?? 0;

    // Total Products
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM products");
    $productCount = $stmt->fetch()['count'] ?? 0;

    echo json_encode([
        'success' => true,
        'data' => [
            'revenue' => (float)$revenue,
            'orderCount' => (int)$orderCount,
            'customerCount' => (int)$customerCount,
            'productCount' => (int)$productCount
        ]
    ]);
}

function getOrders($pdo) {
    $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
    $orders = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $orders]);
}

function getUsers($pdo) {
    $stmt = $pdo->query("SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll();
    echo json_encode(['success' => true, 'data' => $users]);
}

function getCategories($pdo) {
    $stmt = $pdo->query("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''");
    $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(['success' => true, 'data' => $categories]);
}
?>
