import { useEffect, useMemo, useState } from 'react'

const ROWS_PER_PAGE = 8
const COLS_PER_PAGE = 8

const EXAMPLE = {
  n: 6,
  k: 2,
  c: [
    ['12', '9', '7', '14', '11', '10'],
    ['8', '13', '6', '12', '15', '9'],
    ['14', '10', '11', '8', '7', '13'],
    ['9', '12', '14', '7', '10', '8'],
    ['11', '8', '13', '9', '12', '14'],
    ['10', '14', '9', '11', '8', '12'],
  ],
  d: [
    [
      ['1', '0', '1', '0', '0', '1'],
      ['0', '1', '0', '1', '0', '0'],
      ['1', '0', '0', '1', '1', '0'],
      ['0', '1', '1', '0', '0', '1'],
      ['1', '0', '1', '0', '1', '0'],
      ['0', '1', '0', '1', '0', '1'],
    ],
    [
      ['4', '3', '5', '6', '4', '3'],
      ['5', '4', '3', '5', '6', '4'],
      ['6', '5', '4', '3', '5', '6'],
      ['3', '6', '5', '4', '3', '5'],
      ['4', '3', '6', '5', '4', '3'],
      ['5', '4', '3', '6', '5', '4'],
    ],
  ],
  b: ['5', '22'],
  lambda0: ['0', '0'],
  maxIter: '250',
  eps: '0.000001',
  stepMode: 'harmonic',
  stepConst: '0.2',
}

const createMatrix = (rows, cols, fill = '') =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill))
const createVector = (size, fill = '') => Array.from({ length: size }, () => fill)

const clampPage = (page, total) => Math.max(0, Math.min(page, Math.max(0, total - 1)))

const parseNumber = (value, label) => {
  const raw = String(value ?? '').trim()
  if (!raw) throw new Error(`Поле ${label} не заполнено.`)
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) throw new Error(`Поле ${label} должно быть числом.`)
  return parsed
}


const normalizeExampleData = (data) => {
  const n = Number(data?.n)
  const k = Number(data?.k)
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(k) || k < 1) {
    throw new Error('Пример содержит некорректные n/k.')
  }

  const c = createMatrix(n, n).map((row, i) => row.map((_, j) => String(data?.c?.[i]?.[j] ?? '')))
  const d = Array.from({ length: k }, (_, kk) =>
    createMatrix(n, n).map((row, i) => row.map((_, j) => String(data?.d?.[kk]?.[i]?.[j] ?? ''))),
  )

  const b = createVector(k).map((_, i) => String(data?.b?.[i] ?? ''))
  const lambda0 = createVector(k).map((_, i) => String(data?.lambda0?.[i] ?? '0'))

  return {
    n,
    k,
    c,
    d,
    b,
    lambda0,
    maxIter: String(data?.max_iter ?? data?.maxIter ?? 200),
    eps: String(data?.eps ?? 0.000001),
    stepMode: String(data?.step_mode ?? data?.stepMode ?? 'harmonic'),
    stepConst: String(data?.step_const ?? data?.stepConst ?? 0.2),
  }
}

function App() {
  const initial = useMemo(() => EXAMPLE, [])

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

  const [rowPage, setRowPage] = useState(0)
  const [colPage, setColPage] = useState(0)
  const [constraintPage, setConstraintPage] = useState(0)

  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const rowPages = Math.max(1, Math.ceil(n / ROWS_PER_PAGE))
  const colPages = Math.max(1, Math.ceil(n / COLS_PER_PAGE))

  useEffect(() => {
    setRowPage((value) => clampPage(value, rowPages))
    setColPage((value) => clampPage(value, colPages))
    setConstraintPage((value) => clampPage(value, k))
  }, [rowPages, colPages, k])

  const rowStart = rowPage * ROWS_PER_PAGE
  const rowEnd = Math.min(n, rowStart + ROWS_PER_PAGE)
  const colStart = colPage * COLS_PER_PAGE
  const colEnd = Math.min(n, colStart + COLS_PER_PAGE)


  const applyLoadedState = (next) => {
    setN(next.n)
    setK(next.k)
    setNInput(String(next.n))
    setKInput(String(next.k))
    setC(next.c)
    setD(next.d)
    setB(next.b)
    setLambda0(next.lambda0)
    setMaxIter(next.maxIter)
    setEps(next.eps)
    setStepMode(next.stepMode)
    setStepConst(next.stepConst)
    setRowPage(0)
    setColPage(0)
    setConstraintPage(0)
    setError('')
    setResult(null)
  }

  const loadBuiltInExample = () => {
    applyLoadedState(normalizeExampleData(EXAMPLE))
  }

  const loadExampleFromFile = async () => {
    try {
      const response = await fetch('/examples/assignment_optimizer_example.json')
      if (!response.ok) throw new Error('Не удалось загрузить файл примера.')
      const json = await response.json()
      applyLoadedState(normalizeExampleData(json))
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const applyDimensions = () => {
    try {
      const nextN = parseNumber(nInput, 'n')
      const nextK = parseNumber(kInput, 'k')
      if (!Number.isInteger(nextN) || nextN < 1 || !Number.isInteger(nextK) || nextK < 1) {
        throw new Error('n и k должны быть целыми положительными числами.')
      }

      setN(nextN)
      setK(nextK)
      setC((prev) => createMatrix(nextN, nextN).map((r, i) => r.map((_, j) => prev[i]?.[j] ?? '')))
      setD((prev) =>
        Array.from({ length: nextK }, (_, kk) =>
          createMatrix(nextN, nextN).map((r, i) => r.map((_, j) => prev[kk]?.[i]?.[j] ?? '')),
        ),
      )
      setB((prev) => createVector(nextK).map((_, i) => prev[i] ?? ''))
      setLambda0((prev) => createVector(nextK).map((_, i) => prev[i] ?? '0'))
      setError('')
      setResult(null)
    } catch (dimError) {
      setError(dimError.message)
    }
  }

  const updateCell = (setter, matrixData, i, j, value) => {
    const next = matrixData.map((row) => [...row])
    next[i][j] = value
    setter(next)
  }

  const solve = async () => {
    try {
      setError('')
      const payload = {
        n: parseNumber(nInput, 'n'),
        k: parseNumber(kInput, 'k'),
        c: c.map((row, i) => row.map((value, j) => parseNumber(value, `C[${i + 1},${j + 1}]`))),
        d: d.map((matrixData, kk) =>
          matrixData.map((row, i) => row.map((value, j) => parseNumber(value, `D${kk + 1}[${i + 1},${j + 1}]`))),
        ),
        b: b.map((value, i) => parseNumber(value, `b${i + 1}`)),
        lambda0: lambda0.map((value, i) => parseNumber(value, `lambda0[${i + 1}]`)),
        max_iter: parseNumber(maxIter, 'max_iter'),
        eps: parseNumber(eps, 'eps'),
        step_mode: stepMode,
        step_const: parseNumber(stepConst, 'step_const'),
      }

      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ошибка вычисления.')
      setResult(data)
    } catch (solveError) {
      setError(solveError.message)
      setResult(null)
    }
  }

  return (
    <div className="app-screen">
      <section className="panel config-panel">
        <div className="controls-row controls-row--assignment">
          <label className="field">
            <span>n (размер назначения)</span>
            <input value={nInput} onChange={(event) => setNInput(event.target.value)} />
          </label>
          <label className="field">
            <span>k (ограничения)</span>
            <input value={kInput} onChange={(event) => setKInput(event.target.value)} />
          </label>
          <label className="field">
            <span>max_iter</span>
            <input value={maxIter} onChange={(event) => setMaxIter(event.target.value)} />
          </label>
          <label className="field">
            <span>eps</span>
            <input value={eps} onChange={(event) => setEps(event.target.value)} />
          </label>
          <label className="field">
            <span>step_mode</span>
            <select value={stepMode} onChange={(event) => setStepMode(event.target.value)}>
              <option value="harmonic">harmonic (1/(t+1))</option>
              <option value="constant">constant</option>
            </select>
          </label>
          <label className="field">
            <span>step_const</span>
            <input value={stepConst} onChange={(event) => setStepConst(event.target.value)} />
          </label>
          <div className="field field--actions">
            <button type="button" className="btn btn--secondary" onClick={loadBuiltInExample}>Встроенный пример</button>
            <button type="button" className="btn btn--secondary" onClick={loadExampleFromFile}>Пример из файла</button>
            <button type="button" className="btn btn--ghost" onClick={applyDimensions}>Применить размеры</button>
            <button type="button" className="btn btn--primary" onClick={solve}>Решить</button>
          </div>
        </div>

        <div className="tables-row tables-row--assignment">
          <div className="table-block">
            <TableTitle title="Матрица C" subtitle={`${rowStart + 1}-${rowEnd} / ${n}, ${colStart + 1}-${colEnd} / ${n}`} />
            <PagedMatrix
              n={n}
              rowStart={rowStart}
              rowEnd={rowEnd}
              colStart={colStart}
              colEnd={colEnd}
              values={c}
              onChange={(i, j, value) => updateCell(setC, c, i, j, value)}
            />
          </div>

          <div className="table-block">
            <TableTitle
              title={`Матрица D${constraintPage + 1}`}
              subtitle={`${rowStart + 1}-${rowEnd} / ${n}, ${colStart + 1}-${colEnd} / ${n}`}
            />
            <PagedMatrix
              n={n}
              rowStart={rowStart}
              rowEnd={rowEnd}
              colStart={colStart}
              colEnd={colEnd}
              values={d[constraintPage] ?? createMatrix(n, n)}
              onChange={(i, j, value) => {
                const next = d.map((matrixData) => matrixData.map((row) => [...row]))
                next[constraintPage][i][j] = value
                setD(next)
              }}
            />
          </div>

          <div className="table-block table-block--narrow">
            <TableTitle title="Ограничения" subtitle={`Текущее: ${constraintPage + 1}/${k}`} />
            <div className="vector-card">
              <label className="field">
                <span>b{constraintPage + 1}</span>
                <input
                  value={b[constraintPage] ?? ''}
                  onChange={(event) => setB((prev) => prev.map((value, i) => (i === constraintPage ? event.target.value : value)))}
                />
              </label>
              <label className="field">
                <span>lambda0[{constraintPage + 1}]</span>
                <input
                  value={lambda0[constraintPage] ?? ''}
                  onChange={(event) => setLambda0((prev) => prev.map((value, i) => (i === constraintPage ? event.target.value : value)))}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="pagers-row">
          <Pager label="Страницы строк" page={rowPage} total={rowPages} onPrev={() => setRowPage((v) => clampPage(v - 1, rowPages))} onNext={() => setRowPage((v) => clampPage(v + 1, rowPages))} />
          <Pager label="Страницы столбцов" page={colPage} total={colPages} onPrev={() => setColPage((v) => clampPage(v - 1, colPages))} onNext={() => setColPage((v) => clampPage(v + 1, colPages))} />
          <Pager label="Ограничение D/b/λ0" page={constraintPage} total={k} onPrev={() => setConstraintPage((v) => clampPage(v - 1, k))} onNext={() => setConstraintPage((v) => clampPage(v + 1, k))} />
        </div>
      </section>

      <section className="panel result-panel">
        <h2>Результаты</h2>
        {result ? (
          <div className="result-solution">
            <div><strong>Назначение (1-based):</strong> {result.best_assignment_one_based.join(', ')}</div>
            <div><strong>Целевая функция:</strong> {result.best_objective}</div>
            <div><strong>Субградиент:</strong> [{result.best_subgradient.join(', ')}]</div>
            <div><strong>Лучшая итерация:</strong> {result.best_iteration}, всего: {result.iterations_done}</div>
          </div>
        ) : (
          <div className="result-empty">Ожидание расчёта.</div>
        )}

        <div className="szi-visual">
          {(result?.best_assignment_one_based ?? Array.from({ length: n }, (_, i) => i + 1)).map((col, row) => (
            <div key={`${row}-${col}`} className="szi-tile szi-tile--selected" title={`Строка ${row + 1} -> столбец ${col}`}>
              {row + 1}→{col}
            </div>
          ))}
        </div>

        {error ? <div className="error-box">{error}</div> : null}
      </section>
    </div>
  )
}

function TableTitle({ title, subtitle }) {
  return (
    <div className="table-title">
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </div>
  )
}

function PagedMatrix({ rowStart, rowEnd, colStart, colEnd, values, onChange }) {
  const colIndices = Array.from({ length: colEnd - colStart }, (_, offset) => colStart + offset)
  return (
    <table className="matrix-table">
      <thead>
        <tr>
          <th>i/j</th>
          {colIndices.map((col) => (
            <th key={col}>j {col + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rowEnd - rowStart }, (_, offset) => {
          const rowIndex = rowStart + offset
          return (
            <tr key={rowIndex}>
              <th>i {rowIndex + 1}</th>
              {colIndices.map((colIndex) => (
                <td key={`${rowIndex}-${colIndex}`}>
                  <input
                    type="number"
                    step="0.001"
                    value={values[rowIndex]?.[colIndex] ?? ''}
                    onChange={(event) => onChange(rowIndex, colIndex, event.target.value)}
                  />
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Pager({ label, page, total, onPrev, onNext }) {
  return (
    <div className="pager">
      <span>{label}</span>
      <div className="pager-controls">
        <button type="button" onClick={onPrev} disabled={page <= 0}>←</button>
        <strong>{page + 1}/{Math.max(1, total)}</strong>
        <button type="button" onClick={onNext} disabled={page >= total - 1}>→</button>
      </div>
    </div>
  )
}

export default App
