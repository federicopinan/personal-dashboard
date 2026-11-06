export type Task = { id: string; text: string; done: boolean; time?: string; [key: string]: unknown }

const key = (day: string) => `vitality:tasks:${day}`

export function readTasks(storage: Storage, day: string): Task[] {
  const raw = storage.getItem(key(day))
  if (raw === null) return []
  const tasks = JSON.parse(raw)
  if (!Array.isArray(tasks) || tasks.some(t => !t || typeof t !== 'object' || typeof t.id !== 'string' || typeof t.text !== 'string' || typeof t.done !== 'boolean')) throw new Error('Invalid task data')
  return tasks
}

export function validTime(time: string) {
  return time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}

export function withTime(task: Task, time: string): Task {
  const next = { ...task }
  if (time) next.time = time
  else delete next.time
  return next
}

export function carryTasks(tasks: Task[], prior: Task[]) {
  const ids = new Set(tasks.map(t => t.id))
  return [...tasks, ...prior.filter(t => {
    if (t.done || ids.has(t.id)) return false
    ids.add(t.id)
    return true
  })]
}

// Write the destination first: if removing the source fails, both copies survive.
export function moveTask(storage: Storage, source: string, destination: string, tasks: Task[], task: Task) {
  const target = readTasks(storage, destination)
  if (target.some(t => t.id === task.id)) throw new Error('A task with this ID already exists on the destination date.')
  storage.setItem(key(destination), JSON.stringify([...target, task]))
  storage.setItem(key(source), JSON.stringify(tasks.filter(t => t.id !== task.id)))
}
