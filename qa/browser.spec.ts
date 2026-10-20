import { expect, test, type Page, type WebSocketRoute } from '@playwright/test'

// Browser interaction tests with mocked PAS transport. SQL authorization is
// tested separately by actions.mjs; these are not hosted PAS integration tests.
async function fixture(page: Page, roomOpen = false) {
  const now = Date.now()
  const channel = (id: string, name: string) => ({ id, name, workspace_id: 'w', topic: 'Team updates', description: '', is_private: 0, is_archived: 0, archived_at: null as number | null, is_member: 1, can_leave: 0 })
  const channels = [channel('general', 'general')]
  const members = [{ user_id: 'me', display_name: 'Ada', role: 'owner', joined_at: now }, { user_id: 'member', display_name: 'Ben', role: 'member', joined_at: now }]
  const messages = [{ id: 'initial', workspace_id: 'w', channel_id: 'general', user_id: 'me', display_name: 'Ada', body: '<script>plain text</script>', content: '<script>plain text</script>', created_at: now, edited_at: null as number | null, deleted_at: null, reactions: '[]' }]
  const calls: { name: string; params: Record<string, unknown> }[] = []
  let failSend = false
  const sockets: WebSocketRoute[] = []
  const published: unknown[] = []
  await page.routeWebSocket('**/*', socket => {
    if (!roomOpen) return socket.close({ code: 4429, reason: 'room_full' })
    sockets.push(socket)
    socket.onMessage(data => published.push(JSON.parse(String(data))))
    socket.send(JSON.stringify({ kind: 'peers', peers: [{ uid: 'me', login: 'ada' }] }))
  })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname !== '127.0.0.1') return route.abort()
    if (!url.pathname.startsWith('/.pas/')) return route.continue()
    if (url.pathname === '/.pas/auth/me') return route.fulfill({ json: { id: 'me', login: 'ada', name: 'Ada' } })
    if (!url.pathname.includes('/actions/')) return route.fulfill({ json: {} })
    const name = url.pathname.split('/actions/')[1]!
    const params = route.request().postDataJSON().params as Record<string, unknown>
    calls.push({ name, params })
    let rows: unknown[] | null = null
    if (name === 'workspace_list') rows = [{ id: 'w', name: 'Team', slug: 'team', role: 'owner' }]
    else if (name === 'get_channels') rows = channels
    else if (name === 'get_messages') rows = messages.filter(row => row.channel_id === params.channel_id)
    else if (name === 'get_workspace_members' || name === 'get_channel_members') rows = members
    else if (name === 'get_member_profile') rows = members.filter(row => row.user_id === params.user_id)
    else if (name === 'create_channel') channels.push(channel(String(params.channel_id), String(params.name)))
    else if (name === 'update_channel') Object.assign(channels.find(row => row.id === params.channel_id)!, params)
    else if (name === 'archive_channel') Object.assign(channels.find(row => row.id === params.channel_id)!, { is_archived: 1, archived_at: Date.now() })
    else if (name === 'send_message') {
      if (failSend) { failSend = false; return route.fulfill({ status: 503, json: { error: 'unavailable' } }) }
      messages.unshift({ ...messages[0]!, id: String(params.message_id), channel_id: String(params.channel_id), body: String(params.content), content: String(params.content), created_at: Date.now(), reactions: '[]' })
    } else if (name === 'edit_message') Object.assign(messages.find(row => row.id === params.message_id)!, { body: params.content, content: params.content, edited_at: Date.now() })
    else if (name === 'delete_message') messages.splice(messages.findIndex(row => row.id === params.message_id), 1)
    else if (name === 'add_reaction') messages.find(row => row.id === params.message_id)!.reactions = JSON.stringify([{ emoji: params.emoji, count: 1, reacted: 1 }])
    else if (name === 'remove_reaction') messages.find(row => row.id === params.message_id)!.reactions = '[]'
    else if (name === 'update_member_role') members.find(row => row.user_id === params.user_id)!.role = String(params.role)
    else if (name === 'remove_member') members.splice(members.findIndex(row => row.user_id === params.user_id), 1)
    return route.fulfill({ json: rows !== null ? { rows } : { results: [{ meta: { changes: 1 } }, { meta: { changes: 1 } }] } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'general', exact: true })).toBeVisible()
  return { calls, messages, published, failNextSend: () => { failSend = true }, hint: () => sockets.at(-1)!.send(JSON.stringify({ kind: 'msg', from: { uid: 'peer', login: 'peer' }, data: { type: 'messages_changed', body: 'FORGED ROOM CONTENT' }, at: Date.now() })) }
}

test('channel modal restores focus, creates, edits, and archives', async ({ page }) => {
  await fixture(page)
  const create = page.getByRole('button', { name: '+ New Channel', exact: true })
  await create.click()
  await expect(page.getByRole('dialog', { name: 'New channel' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(create).toBeFocused()
  await create.click()
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('project')
  await page.getByRole('button', { name: 'Create channel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'project', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit channel', exact: true }).click()
  await page.getByLabel('Topic', { exact: true }).fill('Delivery plans')
  await page.getByRole('button', { name: 'Save channel' }).click()
  await expect(page.getByText('Delivery plans', { exact: true })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Archive channel' }).click()
  await expect(page.getByRole('heading', { name: 'project (archived)', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeDisabled()
})

test('messages escape HTML, retain retry nonce, edit, react, delete, and clear on sign-out', async ({ page }) => {
  const state = await fixture(page)
  await expect(page.getByText('<script>plain text</script>', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(/polling/i)
  const composer = page.getByRole('textbox', { name: 'Message', exact: true })
  state.failNextSend()
  await composer.fill('A new message')
  await composer.press('Control+Enter')
  await expect(page.getByRole('alert')).toContainText('503')
  await expect(composer).toHaveValue('A new message')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect(composer).toHaveValue('')
  const sends = state.calls.filter(call => call.name === 'send_message')
  expect(sends).toHaveLength(2)
  expect(sends[0]!.params.message_id).toBe(sends[1]!.params.message_id)
  const message = page.getByRole('list', { name: 'Messages' }).getByRole('listitem').filter({ hasText: 'A new message' })
  await message.hover()
  await message.getByRole('button', { name: 'Edit message', exact: true }).click()
  await message.getByRole('textbox', { name: 'Edit message', exact: true }).fill('Edited message')
  await page.getByRole('button', { name: 'Save message', exact: true }).click()
  await expect(page.getByText('Edited message', { exact: true })).toBeVisible()
  const edited = page.getByRole('listitem').filter({ hasText: 'Edited message' })
  await edited.hover()
  await edited.getByRole('button', { name: 'Add 👍 reaction', exact: true }).click()
  await expect(edited.getByRole('button', { name: 'Remove 👍 reaction', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await edited.getByRole('button', { name: 'Remove 👍 reaction', exact: true }).click()
  await expect(edited.getByRole('button', { name: 'Add 👍 reaction', exact: true })).toHaveAttribute('aria-pressed', 'false')
  page.on('dialog', dialog => dialog.accept())
  await edited.getByRole('button', { name: 'Delete message', exact: true }).click()
  await expect(page.getByText('Edited message', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByText('<script>plain text</script>', { exact: true })).toHaveCount(0)
})

test('member directory exposes profile, owner role controls, and removal', async ({ page }) => {
  await fixture(page)
  await page.getByRole('button', { name: 'Members', exact: true }).click()
  await page.getByRole('button', { name: 'Ben', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Ben' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByLabel('Role for Ben').selectOption('admin')
  await expect(page.getByRole('listitem').filter({ hasText: 'Ben' }).getByText('admin', { exact: true })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Remove Ben', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ben', exact: true })).toHaveCount(0)
})

test('ten-second polling reconciles new messages while rooms are unavailable', async ({ page }) => {
  await page.clock.install()
  const state = await fixture(page)
  await expect(page.getByText('<script>plain text</script>', { exact: true })).toBeVisible()
  state.messages.unshift({ ...state.messages[0]!, id: 'polled', body: 'Arrived during outage', content: 'Arrived during outage' })
  await page.clock.fastForward(10000)
  await expect(page.getByText('Arrived during outage', { exact: true })).toBeVisible()
})

test('room hints refetch canonical content and outgoing hints contain no message body', async ({ page }) => {
  const state = await fixture(page, true)
  await expect(page.getByText('<script>plain text</script>', { exact: true })).toBeVisible()
  state.messages.unshift({ ...state.messages[0]!, id: 'hinted', body: 'Canonical from action', content: 'Canonical from action' })
  state.hint()
  await expect(page.getByText('Canonical from action', { exact: true })).toBeVisible()
  await expect(page.getByText('FORGED ROOM CONTENT', { exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Outgoing text')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('')
  await expect.poll(() => state.published.length).toBeGreaterThan(0)
  expect(JSON.stringify(state.published)).not.toContain('Outgoing text')
  expect(JSON.stringify(state.published)).toContain('messages_changed')
})
