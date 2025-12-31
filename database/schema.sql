IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'SalesSystemDB')
BEGIN
    CREATE DATABASE SalesSystemDB;
END
GO
USE SalesSystemDB;
GO

-- Users Table
IF OBJECT_ID('Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        username NVARCHAR(50) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        permissions NVARCHAR(MAX)
    );
END
GO

-- Migration: Ensure permissions column exists
IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'permissions')
BEGIN
    ALTER TABLE Users ADD permissions NVARCHAR(MAX);
END
GO

-- Seed Admin
IF NOT EXISTS(SELECT * FROM Users WHERE username = 'admin')
BEGIN
    INSERT INTO Users (name, username, password, role, permissions)
    VALUES ('Administrador', 'admin', '123', 'admin', '{"pos":"write","products":"write","clients":"write","suppliers":"write","accounts":"write","accountsPayable":"write","users":"write"}');
END
GO

-- Products Table
IF OBJECT_ID('Products', 'U') IS NULL
BEGIN
    CREATE TABLE Products (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code NVARCHAR(50) UNIQUE,
        name NVARCHAR(200) NOT NULL,
        price DECIMAL(18,2) NOT NULL,
        cost DECIMAL(18,2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        category NVARCHAR(100)
    );
END
GO

-- Clients Table
IF OBJECT_ID('Clients', 'U') IS NULL
BEGIN
    CREATE TABLE Clients (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        email NVARCHAR(100),
        phone NVARCHAR(50),
        address NVARCHAR(255),
        creditLimit DECIMAL(18,2) DEFAULT 0,
        debt DECIMAL(18,2) DEFAULT 0,
        allow_credit BIT DEFAULT 1,
        default_credit_days INT DEFAULT 30
    );
END
GO

-- Migration for existing table
IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'allow_credit')
BEGIN
    ALTER TABLE Clients ADD allow_credit BIT DEFAULT 1;
    ALTER TABLE Clients ADD default_credit_days INT DEFAULT 30;
END
GO

-- Suppliers Table
IF OBJECT_ID('Suppliers', 'U') IS NULL
BEGIN
    CREATE TABLE Suppliers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        contact NVARCHAR(100),
        phone NVARCHAR(50),
        email NVARCHAR(100)
    );
END
GO

-- Sales Table
IF OBJECT_ID('Sales', 'U') IS NULL
BEGIN
    CREATE TABLE Sales (
        id INT IDENTITY(1,1) PRIMARY KEY,
        clientId INT FOREIGN KEY REFERENCES Clients(id),
        total DECIMAL(18,2) NOT NULL,
        date DATETIME DEFAULT GETDATE(),
        status NVARCHAR(50) DEFAULT 'completed',
        paymentMethod NVARCHAR(50),
        creditDays INT
    );
END
GO

-- Sale Items Table
IF OBJECT_ID('SaleItems', 'U') IS NULL
BEGIN
    CREATE TABLE SaleItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        saleId INT FOREIGN KEY REFERENCES Sales(id),
        productId INT FOREIGN KEY REFERENCES Products(id),
        qty INT NOT NULL,
        price DECIMAL(18,2) NOT NULL
    );
END
GO

-- Accounts Receivable
IF OBJECT_ID('AccountsReceivable', 'U') IS NULL
BEGIN
    CREATE TABLE AccountsReceivable (
        id INT IDENTITY(1,1) PRIMARY KEY,
        clientId INT FOREIGN KEY REFERENCES Clients(id),
        saleId INT FOREIGN KEY REFERENCES Sales(id),
        amount DECIMAL(18,2) NOT NULL,
        date DATETIME DEFAULT GETDATE(),
        dueDate DATETIME,
        status NVARCHAR(50) DEFAULT 'pending',
        description NVARCHAR(255)
    );
END
GO

-- Accounts Payable
IF OBJECT_ID('AccountsPayable', 'U') IS NULL
BEGIN
    CREATE TABLE AccountsPayable (
        id INT IDENTITY(1,1) PRIMARY KEY,
        supplierId INT FOREIGN KEY REFERENCES Suppliers(id),
        amount DECIMAL(18,2) NOT NULL,
        date DATETIME DEFAULT GETDATE(),
        status NVARCHAR(50) DEFAULT 'pending',
        description NVARCHAR(255)
    );
END
GO
