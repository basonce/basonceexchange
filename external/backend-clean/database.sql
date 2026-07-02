

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `audit_logs` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` char(36) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `meta`, `created_at`) VALUES
('0cd3c918-d070-4541-83ba-c11e082a56ae', '2ebc49da-e7a6-4a4b-89b1-22c8247b85a7', 'user_login', NULL, NULL, '156.218.196.113', NULL, NULL, '2026-06-25 17:14:54'),
('1b0127ff-dff2-425a-bf93-e512ec728c46', '3922d94e-a76d-44c3-8651-94865b280ef1', 'user_login', NULL, NULL, '156.218.196.113', NULL, NULL, '2026-06-25 17:15:03'),
('1e178aef-2baa-40ca-836b-d6216b1aa758', '21298eb2-399d-447b-87fd-bc0817385d8c', 'user_logout', NULL, NULL, '156.218.196.113', NULL, NULL, '2026-06-25 17:04:16'),
('29853713-b3f1-4e3c-a748-2c3c6ac7f1e6', '3922d94e-a76d-44c3-8651-94865b280ef1', 'user_login', NULL, NULL, '156.218.196.113', NULL, NULL, '2026-06-25 17:04:20'),
('3024344d-51ae-4ebb-877c-5e7588ba818d', '3922d94e-a76d-44c3-8651-94865b280ef1', 'user_logout', NULL, NULL, '156.218.34.250', NULL, NULL, '2026-07-01 17:35:35'),
('47b7f4da-bddd-4fed-a38f-7ae7b2a37749', '3922d94e-a76d-44c3-8651-94865b280ef1', 'user_login', NULL, NULL, '156.218.34.250', NULL, NULL, '2026-07-01 17:35:29'),
('4ed90326-03ab-4917-a1fd-d61b74b46c56', '3922d94e-a76d-44c3-8651-94865b280ef1', 'user_logout', NULL, NULL, '156.218.196.113', NULL, NULL, '2026-06-25 17:16:25'),
('52210228-b8d8-4c3d-ad98-8a08d213010e', '21298eb2-399d-447b-87fd-bc0817385d8c', 'user_login', NULL, NULL, '156.218.34.250', NULL, NULL, '2026-07-01 17:35:41'),
('6db56f0a-7322-41c0-85c5-596c9395ab71', '21298eb2-399d-447b-87fd-bc0817385d8c', 'user_login', NULL, NULL, '156.218.34.250', NULL, NULL, '2026-07-01 17:52:40'),
('b2ee8f94-1540-403b-a9ca-9c033baa4f84', '21298eb2-399d-447b-87fd-bc0817385d8c', 'user_login', NULL, NULL, '156.218.196.113', NULL, NULL, '2026-06-25 16:50:31');

CREATE TABLE `deposits` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `coin` varchar(20) NOT NULL,
  `network` varchar(50) NOT NULL,
  `amount` decimal(20,8) NOT NULL,
  `usdt_amount` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `tx_hash` varchar(255) NOT NULL,
  `from_address` varchar(255) DEFAULT NULL,
  `to_address` varchar(255) NOT NULL,
  `confirmations` int(11) NOT NULL DEFAULT 0,
  `required_confirmations` int(11) NOT NULL DEFAULT 6,
  `status` enum('pending','confirming','completed','failed') NOT NULL DEFAULT 'pending',
  `credited_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `deposits` (`id`, `user_id`, `coin`, `network`, `amount`, `usdt_amount`, `tx_hash`, `from_address`, `to_address`, `confirmations`, `required_confirmations`, `status`, `credited_at`, `created_at`, `updated_at`) VALUES
('676f78fb-21d8-47b5-9e14-900efba195df', '21298eb2-399d-447b-87fd-bc0817385d8c', 'BNB', 'bsc', 0.00010000, 0.05546200, '5446746265', NULL, '0x393A4DFFB50751F9D2c562347563ae1d04f3F2c8', 999, 1, 'completed', '2026-07-01 17:37:02', '2026-07-01 17:37:02', '2026-07-01 17:37:02'),
('9659c75f-1dc4-4a00-abc0-a5154a63bced', '21298eb2-399d-447b-87fd-bc0817385d8c', 'BNB', 'bsc', 0.00050000, 0.27756469, '5392940986', NULL, '0x393A4DFFB50751F9D2c562347563ae1d04f3F2c8', 999, 1, 'completed', '2026-07-01 17:38:17', '2026-07-01 17:38:17', '2026-07-01 17:38:17');

CREATE TABLE `deposit_addresses` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `coin` varchar(20) NOT NULL,
  `network` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `memo` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `deposit_addresses` (`id`, `user_id`, `coin`, `network`, `address`, `memo`, `is_active`, `created_at`) VALUES
('4e7bdb51-7805-4183-871a-16b5b0eb941c', '21298eb2-399d-447b-87fd-bc0817385d8c', 'BTC', 'btc', '3JAgDaAH49cCuojU9bMHiJ54tVLrReChry', NULL, 1, '2026-07-01 17:35:46'),
('62b97918-ea76-4f54-8dbd-193c36c2f67a', '21298eb2-399d-447b-87fd-bc0817385d8c', 'BNB', 'bsc', '0x393A4DFFB50751F9D2c562347563ae1d04f3F2c8', NULL, 1, '2026-07-01 17:35:49');

CREATE TABLE `email_verifications` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `fees_collected` (
  `id` char(36) NOT NULL,
  `trade_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `amount` decimal(20,8) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `futures_orders` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `position_id` char(36) DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('long','short') NOT NULL,
  `order_type` enum('open','close') NOT NULL DEFAULT 'open',
  `type` enum('market','limit') NOT NULL DEFAULT 'market',
  `leverage` tinyint(4) NOT NULL DEFAULT 10,
  `amount` decimal(20,8) NOT NULL COMMENT 'base coin amount',
  `price` decimal(20,8) DEFAULT NULL COMMENT 'limit price',
  `executed_price` decimal(20,8) DEFAULT NULL,
  `margin_usdt` decimal(20,8) NOT NULL,
  `fee_usdt` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `realized_pnl` decimal(20,8) DEFAULT NULL,
  `status` enum('pending','filled','cancelled','failed') NOT NULL DEFAULT 'filled',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `futures_positions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('long','short') NOT NULL,
  `leverage` tinyint(4) NOT NULL DEFAULT 10,
  `entry_price` decimal(20,8) NOT NULL,
  `mark_price` decimal(20,8) DEFAULT NULL,
  `size` decimal(20,8) NOT NULL COMMENT 'base coin amount',
  `margin_usdt` decimal(20,8) NOT NULL COMMENT 'collateral locked',
  `notional_usdt` decimal(20,8) NOT NULL COMMENT 'size * entry_price',
  `unrealized_pnl` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `realized_pnl` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `fee_usdt` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `fee_percent` decimal(5,2) NOT NULL DEFAULT 0.05,
  `liquidation_price` decimal(20,8) DEFAULT NULL,
  `take_profit` decimal(20,8) DEFAULT NULL,
  `stop_loss` decimal(20,8) DEFAULT NULL,
  `status` enum('open','closed','liquidated') NOT NULL DEFAULT 'open',
  `closed_price` decimal(20,8) DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `match_bets` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `match_id` varchar(50) NOT NULL COMMENT 'external match id من football-data.org',
  `home_team` varchar(100) NOT NULL,
  `away_team` varchar(100) NOT NULL,
  `kickoff_at` datetime NOT NULL,
  `pick` enum('home','draw','away') NOT NULL COMMENT 'اختيار المستخدم',
  `stake_usdt` decimal(20,8) NOT NULL COMMENT 'مبلغ الرهان (وهمي)',
  `odds` decimal(6,2) NOT NULL DEFAULT 1.90 COMMENT 'المعامل وقت الرهان',
  `potential_payout` decimal(20,8) NOT NULL COMMENT 'stake * odds',
  `result` enum('home','draw','away') DEFAULT NULL COMMENT 'النتيجة الفعلية بعد التسوية',
  `status` enum('pending','won','lost','void') NOT NULL DEFAULT 'pending',
  `settled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `password_resets` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `refresh_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `ip_address`, `user_agent`, `created_at`) VALUES
('07376808-35e6-4fa9-b3ed-d48ff2fd41b6', '3922d94e-a76d-44c3-8651-94865b280ef1', '93b7724a2e3eca0f6411d676681f4b4658fd35ab0b8b0ef7dac7fa7b872da61c', '2026-06-28 22:44:05', NULL, '156.218.189.96', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-21 18:44:05'),
('0917ce70-8441-446a-ab19-12cbf3720703', '21298eb2-399d-447b-87fd-bc0817385d8c', '568e9163589192d3aff72175fa2dfe2c54a91ebed0789ad28210af871db0743b', '2026-07-08 21:52:40', NULL, '156.218.34.250', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-07-01 17:52:40'),
('1eb09b75-6fe9-4864-833d-6195db783bcf', '3922d94e-a76d-44c3-8651-94865b280ef1', '9b43372e3118836bccc903056709320a03e51dd9c5227c2b3c6d089eca3abaea', '2026-06-28 22:03:31', NULL, '156.218.189.96', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-21 18:03:31'),
('3454755c-7f66-4571-9439-5ba93d72005e', '21298eb2-399d-447b-87fd-bc0817385d8c', '99b1820582615ebf99727411d5bbcb2ecc351da36b50afd623344664fadd7a29', '2026-06-25 02:12:54', NULL, '41.43.166.185', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-17 22:12:54'),
('3798aa63-038e-401c-8910-7ee0f726336f', '3922d94e-a76d-44c3-8651-94865b280ef1', 'f92e1d02991b3eb699a86dfcdab3241ac31350d448ef680c02741d033786e8c5', '2026-06-28 02:41:16', NULL, '156.218.22.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-20 22:41:16'),
('39769a96-8d03-42b5-912a-f735277fd4fd', '3922d94e-a76d-44c3-8651-94865b280ef1', '2a1d139b9f084b3bfb5379f41d4ebce8b27d19a96c8ad8a0eb07926d70b44760', '2026-07-02 21:04:20', NULL, '156.218.196.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-25 17:04:20'),
('4302e0d1-0289-4dbb-88b8-d9d85bc0dc7c', '3922d94e-a76d-44c3-8651-94865b280ef1', 'fe08f6aa131da88a2cc064e2bb592fab3e079281ac162d14d285ddf4862f201f', '2026-06-28 23:38:41', NULL, '156.218.189.96', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-21 19:38:41'),
('4fb77903-5525-4fd1-8393-68de4b2f301d', '21298eb2-399d-447b-87fd-bc0817385d8c', '75834ebb660c9b72217a73b716684db4398a252d96cb6e88c72bd59429746969', '2026-06-25 14:30:50', NULL, '41.43.166.185', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-18 10:30:50'),
('51be8a16-6667-4658-bfe4-0930196b9177', '2ebc49da-e7a6-4a4b-89b1-22c8247b85a7', 'c6bb42bb631663e63f9c23bbf79e6075bda93db640b9efeff08683bb9f392b70', '2026-06-25 15:03:02', NULL, '41.43.166.185', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-18 11:03:02'),
('527994df-5632-40b9-aa14-bd2b4cdc95f5', '2ebc49da-e7a6-4a4b-89b1-22c8247b85a7', '07602b57cdfb943bf4e1eab575021d7b729f614a648140bf745e8725e67d4dc8', '2026-07-02 21:14:54', NULL, '156.218.196.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-25 17:14:54'),
('56519ef4-335a-4d92-9596-6958138e13a1', '21298eb2-399d-447b-87fd-bc0817385d8c', 'fc9752f671150a2caff1bcdd07da894be4d6eee1e9e1b51141a58e02373fe4a0', '2026-07-08 21:35:41', NULL, '156.218.34.250', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-07-01 17:35:41'),
('6bc511f1-bcc0-4912-ac25-29e0ec42b39a', '3922d94e-a76d-44c3-8651-94865b280ef1', '17c1d0a1d2f60782fb7487aa206566d3bc4403f62b3f82aeabd9d393979a94d7', '2026-06-28 03:08:54', NULL, '156.218.22.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-20 23:08:54'),
('6eedc329-202b-4a24-b489-1731486e3e43', '21298eb2-399d-447b-87fd-bc0817385d8c', 'd541963b85461c0c8ca5ebf75910f341ea75b47f74ac0619a7301e5daee004e7', '2026-06-28 02:34:05', NULL, '156.218.22.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-20 22:34:05'),
('954e36cb-99cf-4a2c-b399-3d7be393ded5', '21298eb2-399d-447b-87fd-bc0817385d8c', 'e18f9b5b1f548fc5d1d949d9e06bd5cc3540d4a660f600fe59c81f50e75e5e7d', '2026-06-25 15:18:04', NULL, '41.43.166.185', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-18 11:18:04'),
('95971e8d-c6b3-40c9-99f6-25298fee9ba9', '3922d94e-a76d-44c3-8651-94865b280ef1', '8c073b3a826dfaf82c49a99ee4a5012aa5f84922494bbc5144d0b9c0d2ca60ed', '2026-07-08 21:35:29', NULL, '156.218.34.250', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-07-01 17:35:29'),
('99e424bc-1ce5-4836-8d44-c73df1c1f7cc', '3922d94e-a76d-44c3-8651-94865b280ef1', 'dcbc4b840263376b1ec2277f787fd1a8d82f11904c24f7522267c6a81610fc22', '2026-06-28 23:21:35', NULL, '156.218.189.96', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-21 19:21:35'),
('9d40d916-4b75-4b16-9785-b3a1e20d08f7', '3922d94e-a76d-44c3-8651-94865b280ef1', 'a3843e5436617e67ff7f2a66d38586af7f654cb1df11f4e3d9345f5f6de73bca', '2026-06-28 02:27:18', NULL, '156.218.22.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-20 22:27:18'),
('ada6f8b5-d7d4-476e-8d52-6af9fb8e2f2a', '3922d94e-a76d-44c3-8651-94865b280ef1', '758d46905372eaedc67780d507e3e8bc2e25324631c35cd594f4cf0a9a06bda5', '2026-06-28 23:39:05', NULL, '156.218.189.96', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-21 19:39:05'),
('bac92ed8-24f8-4e81-80d8-973e8f1fa836', '21298eb2-399d-447b-87fd-bc0817385d8c', '5d306b81c911f687281f662ce2a02a52d032ca5982efe88692add14160375512', '2026-06-25 14:44:14', NULL, '41.43.166.185', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-18 10:44:14'),
('d8703d82-a82c-46dd-bceb-86164b48a325', '21298eb2-399d-447b-87fd-bc0817385d8c', '084c4f0342c248ce4ae0bb3a21c6b6f25380497132ae73ac51a52489ffac5624', '2026-06-25 14:57:47', NULL, '41.43.166.185', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-18 10:57:47'),
('deba52ae-f6cc-4a9c-bdb6-5df2bf4318e9', '3922d94e-a76d-44c3-8651-94865b280ef1', '30e62d88990fcc9e42a9ceed3d580d6c9b109244619cfa044c479982f4574cf9', '2026-07-02 21:15:03', NULL, '156.218.196.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-25 17:15:03'),
('fe90c171-bee0-4398-b7fa-81009915402e', '21298eb2-399d-447b-87fd-bc0817385d8c', '8795ec74f082d2802c8f0e33d4dfc3b8706e3a3d2b36c6402fb794bd81b3bd3e', '2026-07-02 20:50:31', NULL, '156.218.196.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-25 16:50:31');

CREATE TABLE `trades` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `kucoin_order_id` varchar(255) DEFAULT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('buy','sell') NOT NULL,
  `type` enum('market','limit') NOT NULL DEFAULT 'market',
  `amount` decimal(20,8) NOT NULL,
  `price` decimal(20,8) DEFAULT NULL,
  `executed_price` decimal(20,8) DEFAULT NULL,
  `executed_amount` decimal(20,8) DEFAULT 0.00000000,
  `filled` decimal(20,8) DEFAULT 0.00000000,
  `avg_price` decimal(20,8) DEFAULT NULL,
  `fee_usdt` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `fee_percent` decimal(5,2) NOT NULL DEFAULT 1.00,
  `total_usdt` decimal(20,8) DEFAULT NULL,
  `status` enum('pending','open','partially_filled','filled','cancelled','failed') NOT NULL DEFAULT 'pending',
  `kucoin_status` varchar(50) DEFAULT NULL,
  `error_msg` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE `trading_pairs` (
  `id` char(36) NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `base_coin` varchar(10) NOT NULL,
  `cmc_id` int(11) DEFAULT NULL,
  `display_name` varchar(50) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_spot` tinyint(1) NOT NULL DEFAULT 1,
  `is_futures` tinyint(1) NOT NULL DEFAULT 1,
  `spread_buy` decimal(6,4) NOT NULL DEFAULT 0.0100,
  `spread_sell` decimal(6,4) NOT NULL DEFAULT 0.0100,
  `manual_price` decimal(20,8) DEFAULT NULL,
  `min_trade_usdt` decimal(20,8) NOT NULL DEFAULT 1.00000000,
  `max_trade_usdt` decimal(20,8) NOT NULL DEFAULT 100000.00000000,
  `max_leverage` int(11) NOT NULL DEFAULT 100,
  `min_deposit` decimal(20,8) DEFAULT NULL,
  `min_withdraw` decimal(20,8) DEFAULT NULL,
  `withdraw_fee` decimal(20,8) DEFAULT NULL,
  `has_memo` tinyint(1) NOT NULL DEFAULT 0,
  `networks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`networks`)),
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `trading_pairs` (`id`, `symbol`, `base_coin`, `cmc_id`, `display_name`, `is_active`, `is_spot`, `is_futures`, `spread_buy`, `spread_sell`, `manual_price`, `min_trade_usdt`, `max_trade_usdt`, `max_leverage`, `min_deposit`, `min_withdraw`, `withdraw_fee`, `has_memo`, `networks`, `sort_order`, `created_at`, `updated_at`) VALUES
('d0184c7f-6cf1-11f1-87f4-00163edc5de1', 'BTC-USDT', 'BTC', NULL, 'Bitcoin', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.00010000, 0.00100000, 0.00050000, 0, '[{\"id\":\"btc\",\"label\":\"Bitcoin (BTC)\"}]', 1, '2026-06-20 17:48:45', '2026-06-20 22:28:22'),
('d01854db-6cf1-11f1-87f4-00163edc5de1', 'ETH-USDT', 'ETH', NULL, 'Ethereum', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.01000000, 0.01000000, 0.00500000, 0, '[{\"id\":\"eth\",\"label\":\"Ethereum (ERC20)\"}]', 2, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d0185700-6cf1-11f1-87f4-00163edc5de1', 'BNB-USDT', 'BNB', NULL, 'BNB', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.01000000, 0.01000000, 0.00100000, 0, '[{\"id\":\"bsc\",\"label\":\"BSC (BEP20)\"}]', 3, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d018577c-6cf1-11f1-87f4-00163edc5de1', 'XRP-USDT', 'XRP', NULL, 'XRP', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 1.00000000, 1.00000000, 0.25000000, 1, '[{\"id\":\"xrp\",\"label\":\"XRP Ledger\"}]', 4, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d01857ef-6cf1-11f1-87f4-00163edc5de1', 'SOL-USDT', 'SOL', NULL, 'Solana', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.01000000, 0.01000000, 0.01000000, 0, '[{\"id\":\"sol\",\"label\":\"Solana\"}]', 5, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d018585b-6cf1-11f1-87f4-00163edc5de1', 'ADA-USDT', 'ADA', NULL, 'Cardano', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 1.00000000, 1.00000000, 1.00000000, 0, '[{\"id\":\"ada\",\"label\":\"Cardano\"}]', 6, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d01858c9-6cf1-11f1-87f4-00163edc5de1', 'DOGE-USDT', 'DOGE', NULL, 'Dogecoin', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 10.00000000, 10.00000000, 5.00000000, 0, '[{\"id\":\"doge\",\"label\":\"Dogecoin\"}]', 7, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d018592f-6cf1-11f1-87f4-00163edc5de1', 'TRX-USDT', 'TRX', NULL, 'TRON', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 1.00000000, 1.00000000, 1.00000000, 0, '[{\"id\":\"trx\",\"label\":\"TRC20\"}]', 8, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d0185998-6cf1-11f1-87f4-00163edc5de1', 'LTC-USDT', 'LTC', NULL, 'Litecoin', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.01000000, 0.01000000, 0.00100000, 0, '[{\"id\":\"ltc\",\"label\":\"Litecoin\"}]', 9, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d01859f9-6cf1-11f1-87f4-00163edc5de1', 'ATOM-USDT', 'ATOM', NULL, 'Cosmos', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.10000000, 0.10000000, 0.01000000, 1, '[{\"id\":\"atom\",\"label\":\"Cosmos Hub\"}]', 10, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d0185a5a-6cf1-11f1-87f4-00163edc5de1', 'ALGO-USDT', 'ALGO', NULL, 'Algorand', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 1.00000000, 1.00000000, 0.10000000, 0, '[{\"id\":\"algo\",\"label\":\"Algorand\"}]', 11, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d0185aba-6cf1-11f1-87f4-00163edc5de1', 'DASH-USDT', 'DASH', NULL, 'Dash', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.01000000, 0.01000000, 0.00500000, 0, '[{\"id\":\"dash\",\"label\":\"Dash\"}]', 12, '2026-06-20 17:48:45', '2026-06-20 17:48:45'),
('d0185b1d-6cf1-11f1-87f4-00163edc5de1', 'ZEC-USDT', 'ZEC', NULL, 'Zcash', 1, 1, 1, 0.0100, 0.0100, NULL, 1.00000000, 100000.00000000, 100, 0.00100000, 0.00100000, 0.00050000, 0, '[{\"id\":\"zec\",\"label\":\"Zcash\"}]', 13, '2026-06-20 17:48:45', '2026-06-20 17:48:45');

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `hd_index` int(10) UNSIGNED DEFAULT NULL,
  `kyc_status` enum('none','pending','approved','rejected') DEFAULT 'none',
  `two_fa_secret` varchar(255) DEFAULT NULL,
  `two_fa_enabled` tinyint(1) DEFAULT 0,
  `login_attempts` int(11) DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `is_verified`, `is_active`, `is_admin`, `hd_index`, `kyc_status`, `two_fa_secret`, `two_fa_enabled`, `login_attempts`, `locked_until`, `last_login_at`, `last_login_ip`, `created_at`, `updated_at`) VALUES
('21298eb2-399d-447b-87fd-bc0817385d8c', 'ramymouner@hotmail.com', '$2a$12$mJchtKW3kz7zrdsA13IaGu7E1OKx1slqS9a3pwQLIAtNt/OFlZ9.C', 'RAMY', 1, 1, 0, NULL, 'none', NULL, 0, 0, NULL, '2026-07-01 17:52:40', '156.218.34.250', '2026-06-17 22:12:27', '2026-07-01 17:52:40'),
('2ebc49da-e7a6-4a4b-89b1-22c8247b85a7', 'ramykatour@gmail.com', '$2a$12$XJZy7LS0dHQeFG828rmm7eOXiuBCYs8wBmBxb4xDMN4RgQp6W1SPe', 'Ramy Monir', 1, 1, 0, NULL, 'none', NULL, 0, 0, NULL, '2026-06-25 17:14:54', '156.218.196.113', '2026-06-18 11:02:46', '2026-06-25 17:14:54'),
('3922d94e-a76d-44c3-8651-94865b280ef1', 'admin@yourdomain.com', '$2a$12$lC5VRkvVvKELmBgP3knu4OvnBB2xSAWL/fHrOwQljrkiVKevwE1si', 'Super Admin', 1, 1, 1, NULL, 'none', NULL, 0, 0, NULL, '2026-07-01 17:35:29', '156.218.34.250', '2026-06-18 11:19:55', '2026-07-01 17:35:29');

CREATE TABLE `wallets` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `balance` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `locked` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `currency` varchar(10) NOT NULL DEFAULT 'USDT',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `wallets` (`id`, `user_id`, `balance`, `locked`, `currency`, `created_at`, `updated_at`) VALUES
('17760f4d-39fd-46b4-82f4-c32bb8ae37de', '21298eb2-399d-447b-87fd-bc0817385d8c', 0.33302669, 0.00000000, 'USDT', '2026-06-17 22:12:27', '2026-07-01 17:38:17'),
('38f8bb41-7499-4bdf-8428-24361d78e9c0', '2ebc49da-e7a6-4a4b-89b1-22c8247b85a7', 0.00000000, 0.00000000, 'USDT', '2026-06-18 11:02:46', '2026-06-18 11:02:46'),
('c788903d-713b-4079-aab8-f1741758aaec', '3922d94e-a76d-44c3-8651-94865b280ef1', 0.00000000, 0.00000000, 'USDT', '2026-06-18 11:19:55', '2026-06-18 11:19:55');

CREATE TABLE `wallet_transactions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `type` enum('deposit','withdrawal','trade_buy','trade_sell','fee','refund','admin_credit','admin_debit') NOT NULL,
  `amount` decimal(20,8) NOT NULL,
  `balance_before` decimal(20,8) NOT NULL,
  `balance_after` decimal(20,8) NOT NULL,
  `ref_type` varchar(50) DEFAULT NULL,
  `ref_id` char(36) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `balance_before`, `balance_after`, `ref_type`, `ref_id`, `description`, `created_at`) VALUES
('38b046be-89c7-426b-8965-e5be9129d1c2', '21298eb2-399d-447b-87fd-bc0817385d8c', 'deposit', 0.05546200, 0.00000000, 0.05546200, 'deposit', '676f78fb-21d8-47b5-9e14-900efba195df', 'Deposit 0.0001 BNB (≈0.06 USDT)', '2026-07-01 17:37:02'),
('38e1d29d-4250-43b1-9ef8-d090e9b7cb7e', '21298eb2-399d-447b-87fd-bc0817385d8c', 'deposit', 0.27756469, 0.05546200, 0.33302669, 'deposit', '9659c75f-1dc4-4a00-abc0-a5154a63bced', 'Deposit 0.0005 BNB (≈0.28 USDT)', '2026-07-01 17:38:17');

CREATE TABLE `withdrawals` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `kucoin_wd_id` varchar(255) DEFAULT NULL,
  `coin` varchar(20) NOT NULL,
  `network` varchar(50) NOT NULL,
  `to_address` varchar(255) NOT NULL,
  `memo` varchar(100) DEFAULT NULL,
  `amount` decimal(20,8) NOT NULL,
  `fee` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `net_amount` decimal(20,8) NOT NULL,
  `usdt_value` decimal(20,8) DEFAULT NULL,
  `tx_hash` varchar(255) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `admin_approved` tinyint(1) DEFAULT NULL,
  `admin_id` char(36) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `error_msg` text DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

ALTER TABLE `deposits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tx_hash` (`tx_hash`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_to_address` (`to_address`);

ALTER TABLE `deposit_addresses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_coin_network` (`user_id`,`coin`,`network`),
  ADD KEY `idx_address` (`address`),
  ADD KEY `idx_user_coin` (`user_id`,`coin`);

ALTER TABLE `email_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_token` (`token`),
  ADD KEY `idx_user_id` (`user_id`);

ALTER TABLE `fees_collected`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_trade_id` (`trade_id`),
  ADD KEY `idx_user_id` (`user_id`);

ALTER TABLE `futures_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_position_id` (`position_id`),
  ADD KEY `idx_symbol` (`symbol`);

ALTER TABLE `futures_positions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_symbol` (`symbol`),
  ADD KEY `idx_status` (`status`);

ALTER TABLE `match_bets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mb_user` (`user_id`),
  ADD KEY `idx_mb_match` (`match_id`),
  ADD KEY `idx_mb_status` (`status`);

ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_token_hash` (`token_hash`),
  ADD KEY `idx_user_id` (`user_id`);

ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_token_hash` (`token_hash`),
  ADD KEY `idx_user_id` (`user_id`);

ALTER TABLE `trades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_symbol` (`symbol`),
  ADD KEY `idx_kucoin_order_id` (`kucoin_order_id`);

ALTER TABLE `trading_pairs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `symbol` (`symbol`),
  ADD KEY `idx_symbol` (`symbol`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_sort` (`sort_order`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_email` (`email`),
  ADD UNIQUE KEY `uq_hd_index` (`hd_index`),
  ADD KEY `idx_is_active` (`is_active`);

ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_id` (`user_id`);

ALTER TABLE `wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_ref` (`ref_type`,`ref_id`);

ALTER TABLE `withdrawals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_kucoin_wd_id` (`kucoin_wd_id`);

ALTER TABLE `deposits`
  ADD CONSTRAINT `fk_d_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `deposit_addresses`
  ADD CONSTRAINT `fk_da_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `email_verifications`
  ADD CONSTRAINT `fk_ev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `fees_collected`
  ADD CONSTRAINT `fk_fc_trade` FOREIGN KEY (`trade_id`) REFERENCES `trades` (`id`),
  ADD CONSTRAINT `fk_fc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `futures_orders`
  ADD CONSTRAINT `fk_fo_position` FOREIGN KEY (`position_id`) REFERENCES `futures_positions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_fo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `futures_positions`
  ADD CONSTRAINT `fk_fp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `match_bets`
  ADD CONSTRAINT `fk_mb_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `trades`
  ADD CONSTRAINT `fk_t_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

