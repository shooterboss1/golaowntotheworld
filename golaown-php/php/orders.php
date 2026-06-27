<?php
// orders.php - API endpoint for orders and payments
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}


$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'create';

try {
    require_once 'db.php';
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'create') {
            createOrder($pdo, $data);
        } elseif ($action === 'stripe-intent') {
            createStripeIntent($data);
        } elseif ($action === 'paypal-capture') {
            capturePayPalOrder($data);
        } else {
            throw new Exception("Invalid action");
        }
    } elseif ($method === 'GET') {
        if ($action === 'user-orders' && isset($_GET['email'])) {
            getUserOrders($pdo, $_GET['email']);
        } elseif (isset($_GET['orderNumber'])) {
            trackOrder($pdo, $_GET['orderNumber']);
        } else {
            throw new Exception("Required parameters missing for GET request");
        }
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function createOrder($pdo, $data) {
    if (!isset($data['items']) || !isset($data['total'])) {
        throw new Exception("Items and total amount are required");
    }

    $orderNumber = 'GOLA-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));
    
    $pdo->beginTransaction();
    
    try {
        // Insert order
        $stmt = $pdo->prepare("INSERT INTO orders (order_number, total_amount, first_name, last_name, email, address, city, state, zip_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $orderNumber,
            $data['total'],
            $data['firstName'] ?? '',
            $data['lastName'] ?? '',
            $data['email'] ?? '',
            $data['address'] ?? '',
            $data['city'] ?? '',
            $data['state'] ?? '',
            $data['zipCode'] ?? '',
            'Processing'
        ]);
        
        $orderId = $pdo->lastInsertId();
        
        // Insert items
        $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)");
        foreach ($data['items'] as $item) {
            $itemStmt->execute([
                $orderId,
                $item['productId'],
                $item['quantity'],
                $item['price'],
                $item['size'] ?? 'M'
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'orderNumber' => $orderNumber, 'orderId' => $orderId]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function createStripeIntent($data) {
    // This would use the Stripe PHP library in production
    // For now, we simulate a successful client secret creation
    $amount = $data['amount'] ?? 0;
    
    // Simulate API call to Stripe
    $clientSecret = 'pi_simulated_' . bin2hex(random_bytes(16)) . '_secret_' . bin2hex(random_bytes(10));
    
    echo json_encode([
        'success' => true,
        'clientSecret' => $clientSecret,
        'publishableKey' => 'pk_test_PLACEHOLDER' // You'll replace this with your real key
    ]);
}

function capturePayPalOrder($data) {
    $paypalOrderId = $data['orderID'] ?? null;
    if (!$paypalOrderId) throw new Exception("PayPal Order ID required");
    
    // In production, you would call PayPal API to capture the funds
    // Simulate success
    echo json_encode([
        'success' => true,
        'status' => 'COMPLETED',
        'transactionId' => 'PAYID-' . strtoupper(bin2hex(random_bytes(8)))
    ]);
}

function getUserOrders($pdo, $email) {
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC");
    $stmt->execute([$email]);
    $orders = $stmt->fetchAll();
    
    // Add items for each order
    foreach ($orders as &$order) {
        $itemStmt = $pdo->prepare("SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
        $itemStmt->execute([$order['id']]);
        $order['items'] = $itemStmt->fetchAll();
    }
    
    echo json_encode(['success' => true, 'data' => $orders]);
}

function trackOrder($pdo, $orderNumber) {
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ?");
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch();
    
    if (!$order) {
        throw new Exception("Order not found");
    }
    
    // Get items
    $itemStmt = $pdo->prepare("SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
    $itemStmt->execute([$order['id']]);
    $order['items'] = $itemStmt->fetchAll();
    
    echo json_encode(['success' => true, 'data' => $order]);
}
?>
