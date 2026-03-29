import { useMemo, useState } from 'react'

const MATRIX_ROWS_PER_PAGE = 6
const MATRIX_COLS_PER_PAGE = 6

const EXAMPLE = {
  n: 6,
  k: 2,
  c: [
    [12, 9, 7, 14, 11, 10],
    [8, 13, 6, 12, 15, 9],
    [14, 10, 11, 8, 7, 13],
    [9, 12, 14, 7, 10, 8],
    [11, 8, 13, 9, 12, 14],
    [10, 14, 9, 11, 8, 12],
  ],
  d: [
    [
      [1, 0, 1, 0, 0, 1],
      [0, 1, 0, 1, 0, 0],
      [1, 0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0, 1],
      [1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1],
    ],
    [
      [4, 3, 5, 6, 4, 3],
      [5, 4, 3, 5, 6, 4],
      [6, 5, 4, 3, 5, 6],
      [3, 6, 5, 4, 3, 5],
      [4, 3, 6, 5, 4, 3],
      [5, 4, 3, 6, 5, 4],
    ],
  ],
  b: [5, 22],
  lambda0: [0, 0],
  maxIter: 250,
  eps: 0.000001,
  stepMode: 'harmonic',
  stepConst: 0.2,
}

const matrix = (r, c, v = '') => Array.from({ length: r }, () => Array.from({ length: c }, () => String(v)))
const vector = (len, v = '') => Array.from({ length: len }, () => String(v))

const normalizeMatrix = (source, n) => matrix(n, n).map((row, i) => row.map((_, j) => String(source?.[i]?.[j] ?? '')))

const createStateFromExample = () => {
  const { n, k, c, d, b, lambda0, maxIter, eps, stepMode, stepConst } = EXAMPLE
  return {
    n,
    k,
    c: normalizeMatrix(c, n),
    d: Array.from({ length: k }, (_, idx) => normalizeMatrix(d[idx], n)),
    b: vector(k).map((_, i) => String(b[i] ?? '')),
    lambda0: vector(k).map((_, i) => String(lambda0[i] ?? '')),
    maxIter: String(maxIter),
    eps: String(eps),
    stepMode,
    stepConst: String(stepConst),
  }
}


const adaptExternalExample = (data) => {
  const parsedN = Number(data?.n)
  const parsedK = Number(data?.k)
  if (!Number.isInteger(parsedN) || parsedN < 1 || !Number.isInteger(parsedK) || parsedK < 1) {
    throw new Error('Файл примера: поля n и k должны быть целыми положительными числами.')
  }

  return {
    n: parsedN,
    k: parsedK,
    c: normalizeMatrix(data.c, parsedN),
    d: Array.from({ length: parsedK }, (_, idx) => normalizeMatrix(data?.d?.[idx], parsedN)),
    b: vector(parsedK).map((_, i) => String(data?.b?.[i] ?? '')),
    lambda0: vector(parsedK).map((_, i) => String(data?.lambda0?.[i] ?? '0')),
    maxIter: String(data?.maxIter ?? data?.max_iter ?? 200),
    eps: String(data?.eps ?? 0.000001),
    stepMode: data?.stepMode ?? data?.step_mode ?? 'harmonic',
    stepConst: String(data?.stepConst ?? data?.step_const ?? 0.2),
  }
}
function clampPage(page, totalPages) {
  if (totalPages <= 0) return 0
  return Math.max(0, Math.min(page, totalPages - 1))
}

function parseNumber(value, label) {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new Error(`Поле «${label}» не заполнено.`)
  }
  const parsed = Number(String(value).trim())
  if (!Number.isFinite(parsed)) {
    throw new Error(`Поле «${label}» содержит нечисловое значение.`)
  }
  return parsed
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="pager">
      <button type="button" onClick={() => onChange(0)} disabled={page === 0}>{'<<'}</button>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 0}>{'<'}</button>
      <span>Страница {page + 1} / {totalPages}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === totalPages - 1}>{'>'}</button>
      <button type="button" onClick={() => onChange(totalPages - 1)} disabled={page === totalPages - 1}>{'>>'}</button>
    </div>
  )
}

function MatrixEditor({ title, data, setData, rowPage, setRowPage, colPage, setColPage }) {
  const rows = data.length
  const cols = data[0]?.length ?? 0
  const rowPages = Math.max(1, Math.ceil(rows / MATRIX_ROWS_PER_PAGE))
  const colPages = Math.max(1, Math.ceil(cols / MATRIX_COLS_PER_PAGE))

  const rowStart = rowPage * MATRIX_ROWS_PER_PAGE
  const rowEnd = Math.min(rows, rowStart + MATRIX_ROWS_PER_PAGE)
  const colStart = colPage * MATRIX_COLS_PER_PAGE
  const colEnd = Math.min(cols, colStart + MATRIX_COLS_PER_PAGE)

  return (
    <section className="card">
      <div className="section-head">
        <h3>{title}</h3>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <tbody>
            {Array.from({ length: rowEnd - rowStart }, (_, i) => {
              const realI = rowStart + i
              return (
                <tr key={realI}>
                  {Array.from({ length: colEnd - colStart }, (_, j) => {
                    const realJ = colStart + j
                    return (
                      <td key={realJ}>
                        <input
                          value={data[realI][realJ]}
                          onChange={(e) => {
                            const next = data.map((r) => [...r])
                            next[realI][realJ] = e.target.value
                            setData(next)
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="matrix-pagers">
        <Pagination page={rowPage} totalPages={rowPages} onChange={(p) => setRowPage(clampPage(p, rowPages))} />
        <Pagination page={colPage} totalPages={colPages} onChange={(p) => setColPage(clampPage(p, colPages))} />
      </div>
    </section>
  )
}

export default function App() {
  const initial = useMemo(createStateFromExample, [])

  const [nInput, setNInput] = useState(String(initial.n))
  const [kInput, setKInput] = useState(String(initial.k))
  const [n, setN] = useState(initial.n)
  const [k, setK] = useState(initial.k)
  const [c, setC] = useState(initial.c)
  const [d, setD] = useState(initial.d)
  const [b, setB] = useState(initial.b)
  const [lambda0, setLambda0] = useState(initial.lambda0)
  const [maxIter, setMaxIter] = useState(initial.maxIter)
  const [eps, setEps] = useState(initial.eps)
  const [stepMode, setStepMode] = useState(initial.stepMode)
  const [stepConst, setStepConst] = useState(initial.stepConst)

  const [cRowPage, setCRowPage] = useState(0)
  const [cColPage, setCColPage] = useState(0)
  const [dPages, setDPages] = useState(Array.from({ length: initial.k }, () => ({ row: 0, col: 0 })))

  const [warnings, setWarnings] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const applyDimensions = () => {
    try {
      const nextN = parseNumber(nInput, 'n')
      const nextK = parseNumber(kInput, 'K')
      if (!Number.isInteger(nextN) || nextN < 1 || !Number.isInteger(nextK) || nextK < 1) {
        throw new Error('n и K должны быть целыми положительными числами.')
      }

      setN(nextN)
      setK(nextK)
      setC((prev) => matrix(nextN, nextN).map((row, i) => row.map((_, j) => prev[i]?.[j] ?? '')))
      setD((prev) => Array.from({ length: nextK }, (_, kk) => matrix(nextN, nextN).map((row, i) => row.map((_, j) => prev[kk]?.[i]?.[j] ?? ''))))
      setB((prev) => vector(nextK).map((_, i) => prev[i] ?? ''))
      setLambda0((prev) => vector(nextK).map((_, i) => prev[i] ?? '0'))
      setCRowPage(0)
      setCColPage(0)
      setDPages(Array.from({ length: nextK }, () => ({ row: 0, col: 0 })))
      setWarnings([])
      setResult(null)
      setError('')
    } catch (e) {
      setError(e.message)
      setResult(null)
    }
  }

  const applyState = (state) => {
    setNInput(String(state.n))
    setKInput(String(state.k))
    setN(state.n)
    setK(state.k)
    setC(state.c)
    setD(state.d)
    setB(state.b)
    setLambda0(state.lambda0)
    setMaxIter(state.maxIter)
    setEps(state.eps)
    setStepMode(state.stepMode)
    setStepConst(state.stepConst)
    setCRowPage(0)
    setCColPage(0)
    setDPages(Array.from({ length: state.k }, () => ({ row: 0, col: 0 })))
    setWarnings([])
    setResult(null)
    setError('')
  }

  const loadExample = () => applyState(createStateFromExample())

  const loadExampleFromFile = async () => {
    try {
      const res = await fetch('/examples/assignment_optimizer_example.json')
      if (!res.ok) throw new Error('Не удалось загрузить example JSON файл.')
      const json = await res.json()
      applyState(adaptExternalExample(json))
    } catch (e) {
      setError(e.message)
    }
  }

  const collectWarnings = (payload) => {
    const nextWarnings = []
    if (payload.step_mode === 'constant' && payload.step_const > 1) {
      nextWarnings.push('Для постоянного шага значение step_const > 1 может вызывать неустойчивость сходимости.')
    }
    payload.c.forEach((row, i) => row.forEach((value, j) => {
      if (value < 0) nextWarnings.push(`C[${i + 1},${j + 1}] < 0: это необычно для классической задачи назначений.`)
    }))
    payload.b.forEach((value, i) => {
      if (value < 0) nextWarnings.push(`b${i + 1} < 0: ограничение может стать некорректным.`)
    })
    return nextWarnings
  }

  const solve = async () => {
    try {
      setError('')
      setWarnings([])

      const payload = {
        n: parseNumber(nInput, 'n'),
        k: parseNumber(kInput, 'K'),
        c: c.map((row, i) => row.map((value, j) => parseNumber(value, `C[${i + 1},${j + 1}]`))),
        d: d.map((matrixData, kk) => matrixData.map((row, i) => row.map((value, j) => parseNumber(value, `D${kk + 1}[${i + 1},${j + 1}]`)))),
        b: b.map((value, i) => parseNumber(value, `b${i + 1}`)),
        lambda0: lambda0.map((value, i) => parseNumber(value, `lambda0[${i + 1}]`)),
        max_iter: parseNumber(maxIter, 'max_iter'),
        eps: parseNumber(eps, 'eps'),
        step_mode: stepMode,
        step_const: parseNumber(stepConst, 'step_const'),
      }

      if (!Number.isInteger(payload.n) || payload.n < 1 || !Number.isInteger(payload.k) || payload.k < 1) {
        throw new Error('n и K должны быть целыми положительными числами.')
      }
      if (!Number.isInteger(payload.max_iter) || payload.max_iter < 1) {
        throw new Error('max_iter должен быть положительным целым числом.')
      }
      if (payload.eps <= 0) {
        throw new Error('eps должен быть больше 0.')
      }
      if (payload.lambda0.some((v) => v < 0)) {
        throw new Error('Все значения lambda0 должны быть неотрицательными.')
      }

      const nextWarnings = collectWarnings(payload)
      setWarnings(nextWarnings)

      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    <div className="app-shell">
      <div className="app">
        <header className="hero card">
          <h1>Задача о назначениях с ограничениями</h1>
          <p>Интерфейс с постраничным вводом матриц без прокрутки, загрузкой примера и проверкой данных.</p>
          <div className="hero-actions">
            <button type="button" className="secondary" onClick={loadExample}>Загрузить встроенный пример</button>
            <button type="button" className="secondary" onClick={loadExampleFromFile}>Загрузить пример из файла</button>
            <button type="button" className="primary" onClick={solve}>Решить</button>
          </div>
        </header>

        <section className="card controls-grid">
          <label>n
            <input value={nInput} onChange={(e) => setNInput(e.target.value)} />
          </label>
          <label>K
            <input value={kInput} onChange={(e) => setKInput(e.target.value)} />
          </label>
          <label>max_iter
            <input value={maxIter} onChange={(e) => setMaxIter(e.target.value)} />
          </label>
          <label>eps
            <input value={eps} onChange={(e) => setEps(e.target.value)} />
          </label>
          <label>step_mode
            <select value={stepMode} onChange={(e) => setStepMode(e.target.value)}>
              <option value="harmonic">harmonic (1/(t+1))</option>
              <option value="constant">constant</option>
            </select>
          </label>
          <label>step_const
            <input value={stepConst} onChange={(e) => setStepConst(e.target.value)} />
          </label>
          <button type="button" className="secondary apply-btn" onClick={applyDimensions}>Применить размеры</button>
        </section>

        <MatrixEditor
          title={`Матрица C (${n}x${n})`}
          data={c}
          setData={setC}
          rowPage={cRowPage}
          setRowPage={setCRowPage}
          colPage={cColPage}
          setColPage={setCColPage}
        />

        {Array.from({ length: k }, (_, idx) => (
          <section className="card" key={idx}>
            <MatrixEditor
              title={`Матрица D${idx + 1} (${n}x${n})`}
              data={d[idx] ?? matrix(n, n)}
              setData={(mat) => setD((prev) => prev.map((m, i) => (i === idx ? mat : m)))}
              rowPage={dPages[idx]?.row ?? 0}
              setRowPage={(row) => setDPages((prev) => prev.map((p, i) => (i === idx ? { ...p, row } : p)))}
              colPage={dPages[idx]?.col ?? 0}
              setColPage={(col) => setDPages((prev) => prev.map((p, i) => (i === idx ? { ...p, col } : p)))}
            />
            <div className="vectors">
              <label>b{idx + 1}
                <input value={b[idx] ?? ''} onChange={(e) => setB((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))} />
              </label>
              <label>lambda0[{idx + 1}]
                <input value={lambda0[idx] ?? ''} onChange={(e) => setLambda0((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))} />
              </label>
            </div>
          </section>
        ))}

        {warnings.length > 0 && (
          <section className="warn card">
            <h3>Предупреждения</h3>
            <ul>
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </section>
        )}

        {error ? <section className="error card">{error}</section> : null}

        {result && (
          <section className="result card">
            <h2>Результат</h2>
            <p>Лучшее назначение (1-based): {result.best_assignment_one_based.join(', ')}</p>
            <p>Целевая функция: {result.best_objective}</p>
            <p>Субградиент: [{result.best_subgradient.join(', ')}]</p>
            <p>Итерация: {result.best_iteration}, всего: {result.iterations_done}</p>
          </section>
        )}

        <section className="card">
          <h3>Пример JSON</h3>
          <pre>{JSON.stringify(EXAMPLE, null, 2)}</pre>
        </section>
      </div>
    </div>
  )
}
