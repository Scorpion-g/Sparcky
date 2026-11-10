# ⚡ Sparcky - Monorepo

Monorepo complet pour le bot Discord **Sparcky** et son panel d'administration web.

```
sparcky/
├── apps/
│   ├── bot/            # Bot Discord (discord.js v14, modération, économie, tickets)
│   ├── api/            # API Express (Session, Auth Discord OAuth2, routes REST)
│   └── panel/          # Panel Web (React 19, Vite, TailwindCSS)
├── packages/
│   └── database/       # Modèles Mongoose et valeurs par défaut partagés
├── docker-compose.yml   # Déploiement complet en conteneurs
└── package.json        # Gestionnaire de workspaces npm
```

---

## 🚀 Démarrage en Développement Local

### Prérequis
- Node.js 20+
- npm 10+ (ou pnpm)
- MongoDB local ou une URL MongoDB Atlas

### 1. Installation
```bash
npm install
```

### 2. Configuration (.env)
Copiez le fichier d'exemple et remplissez vos identifiants :
```bash
cp .env.example .env
```

### 3. Lancer les applications
* **Tout lancer en même temps :**
  ```bash
  npm run dev
  ```
* **Lancer individuellement :**
  ```bash
  npm run dev:bot    # Lance uniquement le bot avec rechargement automatique
  npm run dev:api    # Lance uniquement l'API Express
  npm run dev:panel  # Lance le front React sur http://localhost:5173
  ```

---

## 🧪 Tests et Qualité

```bash
npm run test         # Exécute la suite de tests du bot
npm run lint         # Vérifie la conformité ESLint
npm run build        # Build de production du panel React
```

---

## 🐳 Déploiement avec Docker (Local ou VPS)

Pour lancer l'ensemble de la stack (MongoDB + Bot + API + Panel Nginx) en une commande :

```bash
docker compose up -d --build
```

* **Panel web :** accessible sur `http://localhost:8080`
* **API :** accessible sur `http://localhost:3001`
* **Base MongoDB :** port `27017`
* **Bot :** connecté en direct sur Discord en tâche de fond

---

## 🌐 Déploiement sur votre VPS

1. Connectez-vous en SSH à votre VPS.
2. Clonez ce dépôt :
   ```bash
   git clone <url-de-votre-repo-sparcky>
   cd sparcky
   ```
3. Créez votre `.env` de production avec vos vrais tokens et votre nom de domaine.
4. Démarrez tout :
   ```bash
   docker compose up -d --build
   ```
