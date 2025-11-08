pipeline {
  agent any
  parameters {
    // --- App runtime env ---
    string(name: 'PORT', defaultValue: '8080', description: 'API port')
    choice(name: 'GIN_MODE', choices: ['release', 'debug'], description: 'Gin mode')
    string(name: 'DB_HOST', defaultValue: 'db', description: 'DB host (compose service name)')
    string(name: 'DB_PORT', defaultValue: '5432', description: 'DB port')
    string(name: 'DB_USER', defaultValue: 'postgres', description: 'DB user')
    password(name: 'DB_PASSWORD', defaultValue: '', description: 'DB password')
    string(name: 'DB_NAME', defaultValue: 'freelance_monitor', description: 'DB name')
    string(name: 'DB_SSLMODE', defaultValue: 'disable', description: 'DB sslmode')
    password(name: 'JWT_SECRET', defaultValue: '', description: 'JWT secret (required)')
    string(name: 'JWT_TTL_SECONDS', defaultValue: '3600', description: 'JWT TTL seconds')
    string(name: 'RESET_LINK_BASE', defaultValue: 'https://your-domain.com/auth/reset?token=', description: 'Reset link base')
    string(name: 'SMTP_HOST', defaultValue: '', description: 'SMTP host (optional)')
    string(name: 'SMTP_PORT', defaultValue: '587', description: 'SMTP port')
    string(name: 'SMTP_USER', defaultValue: '', description: 'SMTP user')
    password(name: 'SMTP_PASSWORD', defaultValue: '', description: 'SMTP password')
    string(name: 'SMTP_FROM', defaultValue: '', description: 'SMTP from email')
    string(name: 'NEXT_PUBLIC_BACKEND_URL', defaultValue: 'https://your-domain.com', description: 'Public backend URL')

    // --- Build & push ---
    string(name: 'IMAGE_REPO', defaultValue: 'youruser/freelance-monitor-api', description: 'Full image repo (e.g., user/repo)')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: false, description: 'Push image to registry')
    booleanParam(name: 'AUTO_PUSH_ON_MAIN', defaultValue: true, description: 'Auto-push when building main branch')
    booleanParam(name: 'PUSH_LATEST', defaultValue: true, description: 'Also push :latest tag')

    // --- Deploy ---
    booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy to server over SSH')
    string(name: 'SERVER_HOST', defaultValue: 'user@server', description: 'SSH target (user@host)')
  }
  environment {
    // Docker registry credentials (username/password credsId)
    REGISTRY = credentials('docker-registry')
    IMAGE_REPO = "${params.IMAGE_REPO}"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    // Golang cache directories to speed up builds
    GOMODCACHE = "${env.WORKSPACE}/backend/.gomodcache"
    GOCACHE = "${env.WORKSPACE}/backend/.gocache"
  }
  options {
    timestamps()
    ansiColor('xterm')
  }
  stages {
    stage('Validate Params') {
      steps {
        script {
          def errors = []
          if (!params.JWT_SECRET?.trim()) { errors << 'JWT_SECRET is required' }
          if (!params.DB_PASSWORD?.trim()) { errors << 'DB_PASSWORD is required' }
          if (!params.NEXT_PUBLIC_BACKEND_URL?.trim()) { errors << 'NEXT_PUBLIC_BACKEND_URL is required' }
          if (!params.RESET_LINK_BASE?.trim()) { errors << 'RESET_LINK_BASE is required' }
          if (errors) {
            error("Parameter validation failed: " + errors.join('; '))
          }
        }
      }
    }
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Go Test') {
      steps {
        dir('backend') {
          sh 'mkdir -p .gomodcache .gocache'
          sh 'go mod tidy'
          sh 'go fmt ./...'
          sh 'go test ./... -cover'
        }
      }
    }

    stage('Generate Env (.env.production)') {
      steps {
        script {
          def envContent = """
PORT=${params.PORT}
GIN_MODE=${params.GIN_MODE}

# PostgreSQL
DB_HOST=${params.DB_HOST}
DB_PORT=${params.DB_PORT}
DB_USER=${params.DB_USER}
DB_PASSWORD=${params.DB_PASSWORD}
DB_NAME=${params.DB_NAME}
DB_SSLMODE=${params.DB_SSLMODE}

# Auth
JWT_SECRET=${params.JWT_SECRET}
JWT_TTL_SECONDS=${params.JWT_TTL_SECONDS}
AUTH_COOKIE=false
DEV_EXPOSE_RESET_TOKEN=false
DEV_ALLOW_UNAUTH=false

# Password reset link
RESET_LINK_BASE=${params.RESET_LINK_BASE}

# SMTP (optional)
SMTP_HOST=${params.SMTP_HOST}
SMTP_PORT=${params.SMTP_PORT}
SMTP_USER=${params.SMTP_USER}
SMTP_PASSWORD=${params.SMTP_PASSWORD}
SMTP_FROM=${params.SMTP_FROM}

# Frontend
NEXT_PUBLIC_BACKEND_URL=${params.NEXT_PUBLIC_BACKEND_URL}
NEXT_PUBLIC_DEV_ALLOW_UNAUTH=false
"""
          writeFile file: 'deploy/.env.production', text: envContent
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        dir('backend') {
          script {
            sh 'docker build -f Dockerfile -t ${IMAGE_REPO}:${IMAGE_TAG} --target runtime .'
          }
        }
      }
    }

    stage('Login & Push') {
      when { expression { return (params.PUSH_IMAGE || (params.AUTO_PUSH_ON_MAIN && env.BRANCH_NAME == 'main')) } }
      steps {
        script {
          sh 'echo $REGISTRY_PSW | docker login -u $REGISTRY_USR --password-stdin'
          sh 'docker push ${IMAGE_REPO}:${IMAGE_TAG}'
          script {
            if (params.PUSH_LATEST) {
              sh 'docker tag ${IMAGE_REPO}:${IMAGE_TAG} ${IMAGE_REPO}:latest'
              sh 'docker push ${IMAGE_REPO}:latest'
            }
          }
        }
      }
    }

    stage('Deploy (SSH)') {
      when { expression { return params.DEPLOY == true } }
      steps {
        // Example using SSH to run deploy script on server; requires Jenkins SSH credentials
        // Configure credentialsId 'prod-server-ssh' and SERVER_HOST env var.
        sshagent (credentials: ['prod-server-ssh']) {
          sh '''
          set -e
          if [ "${SERVER_HOST}" = "user@server" ] || [ -z "${SERVER_HOST}" ]; then
            echo "SERVER_HOST must be provided" >&2
            exit 1
          fi
          # Copy env file to server
          scp -o StrictHostKeyChecking=no deploy/.env.production $SERVER_HOST:/opt/freelance-monitor-system/deploy/.env.production
          # Trigger deploy (build & up)
          ssh -o StrictHostKeyChecking=no $SERVER_HOST 'cd /opt/freelance-monitor-system/deploy && ./deploy.sh'
          '''
        }
      }
    }
  }
  post {
    always {
      junit allowEmptyResults: true, testResults: 'backend/**/TEST-*.xml'
      archiveArtifacts artifacts: 'deploy/**, backend/Dockerfile, docker-compose.yml, README.md', fingerprint: true, onlyIfSuccessful: false
    }
  }
}
pipeline {
  agent {
    docker {
      image 'node:20'
      args '-u 0:0 -v /var/run/docker.sock:/var/run/docker.sock'
      reuseNode true
    }
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  environment {
    // Fallback defaults; override via Jenkins Global/Node env
    IMAGE_NAME_API = "${env.IMAGE_NAME_API ?: 'freelance-monitor-api:latest'}"
    CONTAINER_NAME_API = "${env.CONTAINER_NAME_API ?: 'freelance-monitor-api'}"
    PORT_HOST = "${env.PORT_HOST ?: '8080'}"
    PORT_CONTAINER = "${env.PORT_CONTAINER ?: '8080'}"
    // Optional named volume for persistent /srv/static
    STATIC_VOLUME_NAME = "${env.STATIC_VOLUME_NAME ?: 'fms_static'}"

    // Backend runtime env (read by the container)
    PORT = "${env.PORT ?: '8080'}"
    GIN_MODE = "${env.GIN_MODE ?: 'release'}"
    DB_HOST = "${env.DB_HOST ?: ''}"
    DB_PORT = "${env.DB_PORT ?: '5432'}"
    DB_USER = "${env.DB_USER ?: ''}"
    DB_PASSWORD = "${env.DB_PASSWORD ?: ''}"
    DB_NAME = "${env.DB_NAME ?: ''}"
    DB_SSLMODE = "${env.DB_SSLMODE ?: 'disable'}"
    JWT_SECRET = "${env.JWT_SECRET ?: ''}"
    JWT_TTL_SECONDS = "${env.JWT_TTL_SECONDS ?: '3600'}"
    RESET_LINK_BASE = "${env.RESET_LINK_BASE ?: ''}"
    SMTP_HOST = "${env.SMTP_HOST ?: ''}"
    SMTP_PORT = "${env.SMTP_PORT ?: '587'}"
    SMTP_USER = "${env.SMTP_USER ?: ''}"
    SMTP_PASSWORD = "${env.SMTP_PASSWORD ?: ''}"
    SMTP_FROM = "${env.SMTP_FROM ?: ''}"
    NEXT_PUBLIC_BACKEND_URL = "${env.NEXT_PUBLIC_BACKEND_URL ?: ''}"

    // Optional: resolve sensitive env via Jenkins Credentials IDs
    JWT_SECRET_CREDENTIALS_ID_API = "${env.JWT_SECRET_CREDENTIALS_ID_API ?: ''}"
    DB_PASSWORD_CREDENTIALS_ID_API = "${env.DB_PASSWORD_CREDENTIALS_ID_API ?: ''}"
  }

  stages {
    stage('Resolve config') {
      steps {
        script {
          if (!env.JWT_SECRET?.trim() && env.JWT_SECRET_CREDENTIALS_ID_API?.trim()) {
            withCredentials([string(credentialsId: env.JWT_SECRET_CREDENTIALS_ID_API, variable: 'JWT_SECRET_RESOLVED')]) {
              env.JWT_SECRET = JWT_SECRET_RESOLVED
            }
          }
          if (!env.DB_PASSWORD?.trim() && env.DB_PASSWORD_CREDENTIALS_ID_API?.trim()) {
            withCredentials([string(credentialsId: env.DB_PASSWORD_CREDENTIALS_ID_API, variable: 'DB_PASSWORD_RESOLVED')]) {
              env.DB_PASSWORD = DB_PASSWORD_RESOLVED
            }
          }
        }
      }
    }

    stage('Validate params') {
      steps {
        script {
          sh '''
            set -e
            [ -n "${CONTAINER_NAME_API:-}" ] || { echo "CONTAINER_NAME_API is required (env)" >&2; exit 1; }
            [ -n "${IMAGE_NAME_API:-}" ] || { echo "IMAGE_NAME_API is required (env)" >&2; exit 1; }
            [ -n "${PORT_HOST:-}" ] || { echo "PORT_HOST is required (env)" >&2; exit 1; }
            [ -n "${PORT_CONTAINER:-}" ] || { echo "PORT_CONTAINER is required (env)" >&2; exit 1; }
            # Require backend runtime env values
            [ -n "${DB_HOST:-}" ] || { echo "DB_HOST is required (env)" >&2; exit 1; }
            [ -n "${DB_PORT:-}" ] || { echo "DB_PORT is required (env)" >&2; exit 1; }
            [ -n "${DB_USER:-}" ] || { echo "DB_USER is required (env)" >&2; exit 1; }
            [ -n "${DB_PASSWORD:-}" ] || { echo "DB_PASSWORD is required (env)" >&2; exit 1; }
            [ -n "${DB_NAME:-}" ] || { echo "DB_NAME is required (env)" >&2; exit 1; }
            [ -n "${JWT_SECRET:-}" ] || { echo "JWT_SECRET is required (env)" >&2; exit 1; }
            [ -n "${NEXT_PUBLIC_BACKEND_URL:-}" ] || { echo "NEXT_PUBLIC_BACKEND_URL is required (env)" >&2; exit 1; }
            [ -n "${RESET_LINK_BASE:-}" ] || { echo "RESET_LINK_BASE is required (env)" >&2; exit 1; }
          '''
        }
      }
    }

    stage('Generate runtime env') {
      steps {
        script {
          def envRuntime = """
PORT=${env.PORT}
GIN_MODE=${env.GIN_MODE}

# PostgreSQL
DB_HOST=${env.DB_HOST}
DB_PORT=${env.DB_PORT}
DB_USER=${env.DB_USER}
DB_PASSWORD=${env.DB_PASSWORD}
DB_NAME=${env.DB_NAME}
DB_SSLMODE=${env.DB_SSLMODE}

# Auth
JWT_SECRET=${env.JWT_SECRET}
JWT_TTL_SECONDS=${env.JWT_TTL_SECONDS}
AUTH_COOKIE=false
DEV_EXPOSE_RESET_TOKEN=false
DEV_ALLOW_UNAUTH=false

# Password reset link
RESET_LINK_BASE=${env.RESET_LINK_BASE}

# SMTP (optional)
SMTP_HOST=${env.SMTP_HOST}
SMTP_PORT=${env.SMTP_PORT}
SMTP_USER=${env.SMTP_USER}
SMTP_PASSWORD=${env.SMTP_PASSWORD}
SMTP_FROM=${env.SMTP_FROM}

# Frontend
NEXT_PUBLIC_BACKEND_URL=${env.NEXT_PUBLIC_BACKEND_URL}
NEXT_PUBLIC_DEV_ALLOW_UNAUTH=false
"""
          writeFile file: 'deploy/.env.runtime', text: envRuntime
        }
      }
    }

    stage('Prepare tools') {
      steps {
        sh 'bash -lc "set -euxo pipefail; apt-get update; apt-get install -y --no-install-recommends docker.io ca-certificates golang; docker version; go version"'
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
        script {
          // Trust mounted workspace directory for Git (fixes 'dubious ownership')
          sh "git config --global --add safe.directory '${WORKSPACE}' || true"
          env.BRANCH = env.BRANCH_NAME ?: sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
          env.SHORT_SHA = env.GIT_COMMIT.take(7)
          echo "Branch: ${env.BRANCH}, Commit: ${env.SHORT_SHA}"
        }
      }
    }

    stage('Go test') {
      steps {
        dir('backend') {
          sh 'bash -lc "set -euxo pipefail; go mod tidy; go test ./... -cover"'
        }
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build -f backend/Dockerfile --target runtime -t ${IMAGE_NAME_API} backend'
      }
    }

    stage('Deploy locally') {
      steps {
        script {
          echo "🚀 Deploying ${env.IMAGE_NAME_API} on this server..."
          sh """
            docker rm -f ${CONTAINER_NAME_API} || true
            docker run -d \
              -p ${PORT_HOST}:${PORT_CONTAINER} \
              --name ${CONTAINER_NAME_API} \
              --restart unless-stopped \
              -v ${STATIC_VOLUME_NAME}:/srv/static \
              --env-file deploy/.env.runtime \
              ${IMAGE_NAME_API}
          """
        }
      }
    }

    stage('Cleanup old images') {
      steps {
        sh 'docker image prune -f || true'
      }
    }
  }

  post {
    success {
      echo '✅ Deployment successful!'
    }
    failure {
      echo '❌ Deployment failed!'
    }
  }
}
