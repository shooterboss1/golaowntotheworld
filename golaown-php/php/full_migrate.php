<?php
// full_migrate.php - One-click database setup and full image synchronization
header('Content-Type: text/html; charset=utf-8');
require_once 'db.php';

echo "<h2>GOLAOWN - Full Database Migration & Image Sync</h2>";

try {
    // 1. Ensure Tables Exist
    echo "Creating tables...<br>";
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(191) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    // Seed Admin User
    $adminEmail = 'admin@wirwp.com';
    $adminPass = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$adminEmail]);
    if (!$stmt->fetch()) {
        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['Admin', 'User', $adminEmail, $adminPass, 'admin']);
        echo "Admin user created: $adminEmail<br>";
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image VARCHAR(255),
        image_url TEXT,
        category VARCHAR(100),
        gender VARCHAR(50) DEFAULT 'unisex',
        stock INT DEFAULT 10,
        rating DECIMAL(3,2) DEFAULT 4.5,
        featured BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Ensure 'sizes' column exists
    $columnCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'sizes'");
    if ($columnCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE products ADD COLUMN sizes VARCHAR(255) DEFAULT 'S,M,L,XL,XXL' AFTER gender");
        echo "Added 'sizes' column to products table.<br>";
    }

    // Ensure 'gender' column exists
    $genderCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'gender'");
    if ($genderCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE products ADD COLUMN gender VARCHAR(50) DEFAULT 'unisex' AFTER category");
        echo "Added 'gender' column to products table.<br>";
    }

    // Ensure 'created_at' column exists
    $dateCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'created_at'");
    if ($dateCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE products ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
        echo "Added 'created_at' column to products table.<br>";
    }

    // Ensure 'image_url' column exists
    $urlCheck = $pdo->query("SHOW COLUMNS FROM products LIKE 'image_url'");
    if ($urlCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE products ADD COLUMN image_url TEXT AFTER image");
        echo "Added 'image_url' column to products table.<br>";
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(191) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        size VARCHAR(20),
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )");

    echo "Tables ready.<br><br>";

    // 2. Sync Images from Assets
    echo "Syncing images from assets/images...<br>";
    
    $imageDir = '../../assets/images/';
    if (!is_dir($imageDir)) {
        throw new Exception("Assets directory not found at $imageDir");
    }

    $images = array_diff(scandir($imageDir), array('.', '..', 'Logo.jpeg', 'hero_bg.png', 'favicon.ico'));
    
    $count = 0;
    foreach ($images as $imageFile) {
        if (!preg_match('/\.(jpg|jpeg|png|webp)$/i', $imageFile)) continue;
        
        // Clean name
        $cleanName = preg_replace('/\s*\(.*?\)\s*/', '', pathinfo($imageFile, PATHINFO_FILENAME));
        $name = ucwords(str_replace(['-', '_'], ' ', $cleanName));
        
        // Categorization & Pricing logic
        $category = 'Regulars';
        $price = 25.00; // Default "Regular" price

        if (stripos($imageFile, 'polo') !== false) {
            $category = 'Polo Shirts';
            $price = 35.00;
        } elseif (stripos($imageFile, 'sweat suit') !== false) {
            $category = 'Sweat Suits';
            $price = 60.00;
        } elseif (stripos($imageFile, 'hoodie') !== false) {
            $category = 'Hoodie Suits';
            $price = 75.00;
        } elseif (stripos($imageFile, 'shorts') !== false) {
            if (stripos($imageFile, 'frisch') !== false) {
                $category = 'Frisch Shorts';
                $price = 25.00;
            } elseif (stripos($imageFile, 'women') !== false) {
                $category = 'Women Shorts';
                $price = 20.00;
            } else {
                $category = 'Shorts';
                $price = 25.00;
            }
        } elseif (stripos($imageFile, 'cap') !== false || stripos($imageFile, 'hat') !== false) {
            if (stripos($imageFile, 'trucker') !== false) {
                $category = 'Trucker Caps';
                $price = 20.00;
            } else {
                $category = 'Bucket Hats';
                $price = 10.00;
            }
        } elseif (stripos($imageFile, 'socks') !== false) {
            $category = 'Socks';
            $price = 10.00;
        } elseif (stripos($imageFile, 'musle') !== false || stripos($imageFile, 'muscle') !== false) {
            $category = 'Muscle Arm';
            $price = 20.00;
        }
        
        // Refined Gender logic
        $gender = 'unisex';
        if (stripos($imageFile, 'women') !== false || stripos($imageFile, 'woman') !== false) {
            $gender = 'women';
        } elseif (stripos($imageFile, 'men') !== false || stripos($imageFile, 'man') !== false) {
            $gender = 'men';
        } else {
            if ($category === 'Sweat Suits' || $category === 'Women Shorts') $gender = 'women';
            if ($category === 'Polo Shirts' || $category === 'Muscle Arm') $gender = 'men';
        }

        // 1. Sync price for EXISTING products
        $stmt = $pdo->prepare("UPDATE products SET price = ?, category = ?, gender = ? WHERE image = ?");
        $stmt->execute([$price, $category, $gender, $imageFile]);

        // 2. Check if exists for INSERT
        $stmt = $pdo->prepare("SELECT id FROM products WHERE image = ?");
        $stmt->execute([$imageFile]);
        
        if (!$stmt->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO products (name, description, price, image, category, gender, sizes, stock, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $name,
                "The premium GOLAOWN $name. A masterpiece of streetwear design, combining luxury comfort with a bold aesthetic.",
                $price,
                $imageFile,
                $category,
                $gender,
                "S,M,L,XL,XXL",
                rand(10, 50),
                (rand(40, 50) / 10)
            ]);
            $count++;
            echo "Added: $imageFile as $name ($category / $gender) at $$price<br>";
        } else {
            echo "Updated: $imageFile price to $$price<br>";
        }
    }

    echo "<h3>Success! $count new images synchronized to your database.</h3>";
    echo "<p>All products are now ready to display on the website.</p>";
    echo "<a href='../../index.html' style='padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;'>Back to Website</a>";

} catch (Exception $e) {
    echo "<h3 style='color: red;'>Migration Failed: " . $e->getMessage() . "</h3>";
    echo "Check your database connection in db.php";
}
?>
