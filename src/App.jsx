import { useMemo, useState } from 'react'

const matrix = (r, c, v = 0) => Array.from({ length: r }, () => Array.from({ length: c }, () => v))

function toNum(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) throw new Error(`Некорректное число: ${value}`)
  return n
}

export default function App() {
  const [n, setN] = useState(4)
  const [k, setK] = useState(1)
  const [c, setC] = useState(matrix(4, 4, 0))
  const [d, setD] = useState([matrix(4, 4, 0)])
  const [b, setB] = useState([1])
  const [lambda0, setLambda0] = useState([0])
  const [maxIter, setMaxIter] = useState(200)
  const [eps, setEps] = useState(1e-6)
  const [stepMode, setStepMode] = useState('harmonic')
  const [stepConst, setStepConst] = useState(0.2)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const resize = () => {
    setC((prev) => matrix(n, n, 0).map((row, i) => row.map((_, j) => prev[i]?.[j] ?? 0)))
    setD((prev) => Array.from({ length: k }, (_, kk) => matrix(n, n, 0).map((row, i) => row.map((_, j) => prev[kk]?.[i]?.[j] ?? 0))))
    setB((prev) => Array.from({ length: k }, (_, i) => prev[i] ?? 0))
    setLambda0((prev) => Array.from({ length: k }, (_, i) => prev[i] ?? 0))
  }

  const payload = useMemo(
    () => ({ n, k, c, d, b, lambda0, max_iter: maxIter, eps, step_mode: stepMode, step_const: stepConst }),
    [n, k, c, d, b, lambda0, maxIter, eps, stepMode, stepConst],
  )

  const solve = async () => {
    try {
      setError('')
      const normalized = {
        ...payload,
        c: c.map((r) => r.map(toNum)),
        d: d.map((m) => m.map((r) => r.map(toNum))),
        b: b.map(toNum),
        lambda0: lambda0.map(toNum),
      }

      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка вычисления')
      setResult(data)
    } catch (e) {
      setError(e.message)
      setResult(null)
    }
  }

  return (
    <div className="app">
      <h1>Задача о назначениях с ограничениями (метод Удзавы)</h1>
      <div className="controls">
        <label>n: <input type="number" min="1" value={n} onChange={(e) => setN(Number(e.target.value) || 1)} /></label>
        <label>K: <input type="number" min="1" value={k} onChange={(e) => setK(Number(e.target.value) || 1)} /></label>
        <button onClick={resize}>Применить размеры</button>
        <label>max_iter: <input type="number" min="1" value={maxIter} onChange={(e) => setMaxIter(Number(e.target.value) || 1)} /></label>
        <label>eps: <input type="number" step="any" value={eps} onChange={(e) => setEps(Number(e.target.value) || 1e-6)} /></label>
        <label>
          шаг:
          <select value={stepMode} onChange={(e) => setStepMode(e.target.value)}>
            <option value="harmonic">1/(t+1)</option>
            <option value="constant">constant</option>
          </select>
        </label>
        <label>step_const: <input type="number" step="any" value={stepConst} onChange={(e) => setStepConst(Number(e.target.value) || 0.1)} /></label>
      </div>

      <h2>C ({n}x{n})</h2>
      <MatrixEditor data={c} setData={setC} />

      {Array.from({ length: k }, (_, idx) => (
        <div key={idx}>
          <h2>D{idx + 1}</h2>
          <MatrixEditor data={d[idx] ?? matrix(n, n, 0)} setData={(mat) => setD((prev) => prev.map((m, i) => (i === idx ? mat : m)))} />
          <label>b{idx + 1}: <input value={b[idx] ?? 0} onChange={(e) => setB((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))} /></label>
          <label>lambda0[{idx + 1}]: <input value={lambda0[idx] ?? 0} onChange={(e) => setLambda0((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))} /></label>
        </div>
      ))}

      <button className="solve" onClick={solve}>Решить</button>

      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <div className="result">
          <h2>Результат</h2>
          <p>Лучшее назначение (1-based): {result.best_assignment_one_based.join(', ')}</p>
          <p>Целевая функция: {result.best_objective}</p>
          <p>Субградиент: [{result.best_subgradient.join(', ')}]</p>
          <p>Итерация: {result.best_iteration}, всего: {result.iterations_done}</p>
        </div>
      ) : null}
    </div>
  )
}

function MatrixEditor({ data, setData }) {
  return (
    <table className="matrix">
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {row.map((value, j) => (
              <td key={j}>
                <input
                  value={value}
                  onChange={(e) => {
                    const next = data.map((r) => [...r])
                    next[i][j] = e.target.value
                    setData(next)
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
