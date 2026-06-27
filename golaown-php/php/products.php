<?php
// products.php - API endpoint for fetching products
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once 'db.php';
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        $isFeatured = isset($_GET['featured']) && $_GET['featured'] === 'true';
        $category = isset($_GET['category']) ? sanitize($_GET['category']) : null;
        $gender = isset($_GET['gender']) ? sanitize($_GET['gender']) : null;
        $search = isset($_GET['search']) ? sanitize($_GET['search']) : null;
        $maxPrice = isset($_GET['maxPrice']) ? floatval($_GET['maxPrice']) : null;
        
        // Check if products table exists
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'products'");
        if ($tableCheck->rowCount() == 0) {
            echo json_encode(['success' => true, 'data' => [], 'message' => 'Products table not initialized']);
            exit;
        }

        // Check if gender column exists
        $columnCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'gender'");
        $hasGender = $columnCheck->rowCount() > 0;

        // Check if created_at column exists
        $dateColumnCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'created_at'");
        $hasCreatedAt = $dateColumnCheck->rowCount() > 0;

        $query = "SELECT * FROM products WHERE 1=1";
        $params = [];

        if ($id) {
            $query .= " AND id = :id";
            $params[':id'] = $id;
        }
        
        if ($gender && $hasGender) {
            $query .= " AND gender = :gender";
            $params[':gender'] = $gender;
        }
        
        if ($category) {
            $query .= " AND category = :category";
            $params[':category'] = $category;
        }
        
        if ($search) {
            $query .= " AND (name LIKE :search1 OR description LIKE :search2)";
            $params[':search1'] = "%$search%";
            $params[':search2'] = "%$search%";
        }

        if ($maxPrice) {
            $query .= " AND price <= :maxPrice";
            $params[':maxPrice'] = $maxPrice;
        }

        if ($isFeatured) {
            $query .= " ORDER BY rating DESC LIMIT 8";
        } else {
            $orderCol = $hasCreatedAt ? 'created_at' : 'id';
            $query .= " ORDER BY $orderCol DESC";
        }
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // If searching for a single product by ID, return the object directly
        if ($id && count($products) === 1) {
            $products = $products[0];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $products
        ]);
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) throw new Exception("No data provided");

        $stmt = $pdo->prepare("INSERT INTO products (name, description, price, image, image_url, category, gender, sizes, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['description'] ?? '',
            $data['price'],
            $data['image'] ?? '',
            $data['image_url'] ?? '',
            $data['category'] ?? 'Other',
            $data['gender'] ?? 'unisex',
            $data['sizes'] ?? 'S,M,L,XL,XXL',
            $data['stock'] ?? 0
        ]);
        
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } elseif ($method === 'PUT') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) throw new Exception("Product ID required");
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) throw new Exception("No data provided");

        $stmt = $pdo->prepare("UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category = ?, gender = ?, stock = ? WHERE id = ?");
        $stmt->execute([
            $data['name'],
            $data['description'] ?? '',
            $data['price'],
            $data['image_url'] ?? '',
            $data['category'] ?? 'Other',
            $data['gender'] ?? 'unisex',
            $data['stock'] ?? 0,
            $id
        ]);
        
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$id) throw new Exception("Product ID required");
        
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    }
    
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch products: ' . $e->getMessage()
    ]);
}
?>
