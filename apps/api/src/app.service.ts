import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHomePage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ashinaga API</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 0.5rem;
            font-size: 2.5rem;
        }
        .subtitle {
            color: #7f8c8d;
            margin-bottom: 2rem;
            font-size: 1.2rem;
        }
        .section {
            margin: 2rem 0;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .section h2 {
            color: #2c3e50;
            margin-top: 0;
        }
        .swagger-btn {
            display: inline-block;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: transform 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .swagger-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        .status {
            display: inline-flex;
            align-items: center;
            font-size: 0.9rem;
            color: #28a745;
        }
        .status::before {
            content: "●";
            margin-right: 0.5rem;
            font-size: 1.2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Ashinaga API</h1>
        <p class="subtitle">Welcome to Ashinaga's API</p>
        
        <div class="status">The API is running and ready to serve requests.</div>
        
        <div class="section">
            <h2>📚 API Documentation</h2>
            <p>Explore the complete API documentation with interactive examples using Swagger UI.</p>
            <a href="/api" class="swagger-btn">View Swagger Documentation →</a>
        </div>
        
        <div class="section">
            <h2>⚡ Tech Stack</h2>
            <ul>
                <li><strong>Framework:</strong> NestJS with Fastify adapter</li>
                <li><strong>Runtime:</strong> Node.js</li>
                <li><strong>Language:</strong> TypeScript</li>
                <li><strong>Documentation:</strong> Swagger/OpenAPI</li>
                <li><strong>Validation:</strong> Class Validator</li>
            </ul>
        </div>
        
        <div class="section">
            <h2>🛠️ Development</h2>
            <p>This API is part of the Ashinaga monorepo. For development instructions, check the repository documentation.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
