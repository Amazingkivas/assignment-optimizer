# Assignment Optimizer

Приложение для приближённого решения **задачи о назначениях с ограничениями** из `task.txt`.

## Что реализовано

- Backend на Flask + SciPy.
- Метод Лагранжа/Удзавы:
  - на каждой итерации решается обычная задача о назначениях для матрицы
    `G = C + sum(lambda_k * D_k)`;
  - вычисляется субградиент ограничений;
  - обновляются множители `lambda` проекцией на `lambda >= 0`.
- Frontend на React (Vite) с редактированием матриц `C`, `D_k`, векторов `b`, `lambda0`.

## Запуск

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

### Frontend

```bash
npm install
npm run dev
```

Фронтенд работает на `http://localhost:5173`, API проксируется на `http://127.0.0.1:8080`.
