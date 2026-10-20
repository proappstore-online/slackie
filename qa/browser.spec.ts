import { expect, test, type Page, type WebSocketRoute } from '@playwright/test'

// Browser interaction tests with mocked PAS transport. SQL authorization is
// tested separately by actions.mjs; these are not hosted PAS integration tests.
async function fixture(page: Page, roomOpen = false, options: { emptyChannels?: boolean; noWorkspace?: boolean; role?: 'owner' | 'admin' | 'member' } = {}) {
  const now = Date.now()
  const channel = (id: string, name: string) => ({ id, name, workspace_id: 'w', topic: 'Team updates', description: '', is_private: 0, is_archived: 0, archived_at: null as number | null, is_member: 1, can_leave: 0 })
  const channels = options.emptyChannels ? [] : [channel('general', 'general')]
  const workspaces = options.noWorkspace ? [] : [{ id: 'w', name: 'Team', slug: 'team', role: options.role ?? 'owner' }]
  const members = [{ user_id: 'me', display_name: 'Ada', mention_handle: 'ada', role: options.role ?? 'owner', joined_at: now }, { user_id: 'member', display_name: 'Ben', mention_handle: 'ben', role: 'member', joined_at: now }]
  const messages = [{ id: 'initial', workspace_id: 'w', channel_id: 'general', user_id: 'me', display_name: 'Ada', body: '<script>plain text</script>', content: '<script>plain text</script>', created_at: now, edited_at: null as number | null, deleted_at: null as number | null, parent_id: null as string | null, reply_count: 0, reactions: '[]' }]
  const calls: { name: string; params: Record<string, unknown> }[] = []
  const mentions: { message_id: string; channel_id: string; channel_name: string; parent_id: string | null; root_id: string; body: string; created_at: number; seen_at: number | null }[] = []
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
    if (name === 'workspace_list') rows = workspaces
    else if (name === 'workspace_create') workspaces.push({ id: String(params.workspace_id), name: String(params.name), slug: String(params.slug), role: 'owner' })
    else if (name === 'update_workspace') workspaces.find(row => row.id === params.workspace_id)!.name = String(params.name)
    else if (name === 'list_mentions') rows = mentions
    else if (name === 'get_mention_count') rows = [{ count: mentions.filter(row => row.seen_at === null).length }]
    else if (name === 'acknowledge_mention') mentions.find(row => row.message_id === params.message_id)!.seen_at = Date.now()
    else if (name === 'get_channels') rows = channels
    else if (name === 'get_messages') rows = messages.filter(row => row.channel_id === params.channel_id && row.parent_id === null).map(row => ({ ...row, reply_count: messages.filter(reply => reply.parent_id === row.id).length }))
    else if (name === 'get_thread_root') rows = messages.filter(row => row.id === params.parent_id && row.parent_id === null)
    else if (name === 'list_thread') rows = messages.filter(row => row.channel_id === params.channel_id && row.parent_id === params.parent_id)
    else if (name === 'get_workspace_members' || name === 'get_channel_members') rows = members
    else if (name === 'get_member_profile') rows = members.filter(row => row.user_id === params.user_id)
    else if (name === 'create_channel') channels.push({ ...channel(String(params.channel_id), String(params.name)), workspace_id: String(params.workspace_id) })
    else if (name === 'update_channel') Object.assign(channels.find(row => row.id === params.channel_id)!, params)
    else if (name === 'archive_channel') Object.assign(channels.find(row => row.id === params.channel_id)!, { is_archived: 1, archived_at: Date.now() })
    else if (name === 'send_message' || name === 'thread_reply') {
      if (failSend) { failSend = false; return route.fulfill({ status: 503, json: { error: 'unavailable' } }) }
      messages.unshift({ ...messages[0]!, id: String(params.message_id), channel_id: String(params.channel_id), parent_id: name === 'thread_reply' ? String(params.parent_id) : null, body: String(params.content), content: String(params.content), created_at: Date.now(), reactions: '[]' })
    } else if (name === 'edit_message') Object.assign(messages.find(row => row.id === params.message_id)!, { body: params.content, content: params.content, edited_at: Date.now() })
    else if (name === 'delete_message') messages.splice(messages.findIndex(row => row.id === params.message_id), 1)
    else if (name === 'add_reaction') messages.find(row => row.id === params.message_id)!.reactions = JSON.stringify([{ emoji: params.emoji, count: 1, reacted: 1 }])
    else if (name === 'remove_reaction') messages.find(row => row.id === params.message_id)!.reactions = '[]'
    else if (name === 'update_my_profile') Object.assign(members.find(row => row.user_id === 'me')!, { display_name: String(params.display_name), ...(params.mention_handle ? { mention_handle: String(params.mention_handle) } : {}) })
    else if (name === 'update_member_role') members.find(row => row.user_id === params.user_id)!.role = String(params.role)
    else if (name === 'remove_member') members.splice(members.findIndex(row => row.user_id === params.user_id), 1)
    return route.fulfill({ json: rows !== null ? { rows } : { results: [{ meta: { changes: 1 } }, { meta: { changes: 1 } }] } })
  })
  await page.goto('/')
  if (options.noWorkspace) await expect(page.getByText('Create a workspace to get started.', { exact: true })).toBeVisible()
  else if (options.emptyChannels && options.role === 'member') await expect(page.getByText('Ask an owner or admin to create your first channel.', { exact: true })).toBeVisible()
  else if (options.emptyChannels) await expect(page.getByRole('heading', { name: 'Create your first channel', exact: true })).toBeVisible()
  else await expect(page.getByRole('heading', { name: 'general', exact: true })).toBeVisible()
  return { calls, channels, messages, mentions, published, failNextSend: () => { failSend = true }, hint: () => sockets.at(-1)!.send(JSON.stringify({ kind: 'msg', from: { uid: 'peer', login: 'peer' }, data: { type: 'messages_changed', body: 'FORGED ROOM CONTENT' }, at: Date.now() })) }
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

test('thread panel sends replies with retry ids and keeps them out of the timeline', async ({ page }) => {
  const state = await fixture(page)
  await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
  const thread = page.getByRole('region', { name: 'Thread', exact: true })
  await expect(thread.getByRole('heading', { name: 'Thread', exact: true })).toBeFocused()
  state.failNextSend()
  await thread.getByRole('textbox', { name: 'Reply', exact: true }).fill('Replying to the root')
  await thread.getByRole('button', { name: 'Send reply', exact: true }).click()
  await expect(thread.getByRole('alert')).toContainText('503')
  await expect(thread.getByRole('textbox', { name: 'Reply', exact: true })).toHaveValue('Replying to the root')
  await thread.getByRole('button', { name: 'Send reply', exact: true }).click()
  await expect(thread.getByText('Replying to the root', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Messages', exact: true }).getByText('Replying to the root', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reply in thread (1)', exact: true })).toBeVisible()
  const replies = state.calls.filter(call => call.name === 'thread_reply')
  expect(replies).toHaveLength(2)
  expect(replies[0]!.params.message_id).toBe(replies[1]!.params.message_id)
  await thread.getByRole('button', { name: 'Close thread', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reply in thread (1)', exact: true })).toBeFocused()
})

test('mentions badge opens a reply context and acknowledges independently', async ({ page }) => {
  await page.clock.install()
  const state = await fixture(page)
  state.messages.unshift({ ...state.messages[0]!, id: 'mention-reply', parent_id: 'initial', user_id: 'member', display_name: 'Ben', body: 'Hi @ada from a thread', content: 'Hi @ada from a thread' })
  state.mentions.push({ message_id: 'mention-reply', channel_id: 'general', channel_name: 'general', parent_id: 'initial', root_id: 'initial', body: 'Hi @ada from a thread', created_at: Date.now(), seen_at: null })
  await page.clock.fastForward(10000)
  await page.getByRole('button', { name: 'Mentions (1 unread)', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mentions', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open mentioned message', exact: true }).click()
  const thread = page.getByRole('region', { name: 'Thread', exact: true })
  await expect(thread.getByText('Hi @ada from a thread', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mentions (0 unread)', exact: true })).toBeVisible()
  expect(state.calls.some(call => call.name === 'acknowledge_mention')).toBeTruthy()
  expect(state.calls.some(call => call.name === 'channel_mark_read')).toBeFalsy()
})

test('owner workspace settings update the switcher; admins see read-only name', async ({ page }) => {
  await fixture(page)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('textbox', { name: 'Workspace name', exact: true }).fill('Renamed team')
  await page.getByRole('button', { name: 'Save workspace name', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Workspace name saved.')
  await expect(page.getByRole('combobox', { name: 'Workspace', exact: true })).toContainText('Renamed team')
})

test('administrator settings cannot change the workspace name', async ({ page }) => {
  const state = await fixture(page, false, { role: 'admin' })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Workspace name', exact: true })).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: 'Save workspace name', exact: true })).toHaveCount(0)
  expect(state.calls.some(call => call.name === 'update_workspace')).toBeFalsy()
})

test('first-run onboarding creates workspace then general with a welcome hint', async ({ page }) => {
  await fixture(page, false, { noWorkspace: true, emptyChannels: true })
  await page.getByText('Create a workspace', { exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('New team')
  await page.getByLabel('Slug', { exact: true }).fill('new-team')
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click()
  await page.getByRole('button', { name: 'Create your first channel', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Name', { exact: true })).toHaveValue('general')
  await page.getByRole('button', { name: 'Create channel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'general', exact: true })).toBeVisible()
  await expect(page.getByRole('note')).toContainText('Welcome to #general')
})

test('profile settings establish a mention handle visible in the directory', async ({ page }) => {
  await fixture(page)
  await page.getByRole('button', { name: 'Members', exact: true }).click()
  await page.getByLabel('Your display name', { exact: true }).fill('Ada Lovelace')
  await page.getByLabel('Mention handle', { exact: true }).fill('ada-lovelace')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.getByText('@ada-lovelace', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ada Lovelace', exact: true })).toBeVisible()
})

test('members without visible channels see guidance without creation or admin controls', async ({ page }) => {
  await fixture(page, false, { emptyChannels: true, role: 'member' })
  await expect(page.getByRole('button', { name: '+ New Channel', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create your first channel', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0)
})

test('message edit locks the draft until the save finishes', async ({ page }) => {
  const state = await fixture(page)
  const message = page.getByRole('list', { name: 'Messages', exact: true }).getByRole('listitem').first()
  await message.getByRole('button', { name: 'Edit message', exact: true }).click()
  const editor = message.getByRole('textbox', { name: 'Edit message', exact: true })
  await editor.fill('Saved draft')
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/actions/edit_message', async route => {
    await gate
    await route.fallback()
  })
  try {
    await message.getByRole('button', { name: 'Save message', exact: true }).click()
    await expect(editor).toBeDisabled()
    await expect(message.getByRole('button', { name: 'Cancel edit', exact: true })).toBeDisabled()
  } finally { release() }
  await expect(message.getByText('Saved draft', { exact: true })).toBeVisible()
  expect(state.calls.filter(call => call.name === 'edit_message')).toHaveLength(1)
})

test('channel and thread composers keep Shift+Enter and IME Enter as draft input', async ({ page }) => {
  const state = await fixture(page)
  await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
  for (const name of ['Message', 'Reply']) {
    const composer = page.getByRole('textbox', { name, exact: true })
    await composer.fill('First line')
    await composer.press('End')
    await composer.press('Shift+Enter')
    await expect(composer).toHaveValue('First line\n')
    await composer.dispatchEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })
    await expect(composer).toHaveValue('First line\n')
    expect(state.calls.filter(call => ['send_message', 'thread_reply'].includes(call.name))).toHaveLength(name === 'Message' ? 0 : 1)
    await composer.press('Enter')
    await expect(composer).toHaveValue('')
  }
  expect(state.calls.filter(call => ['send_message', 'thread_reply'].includes(call.name))).toHaveLength(2)
})

for (const action of ['workspace_list', 'get_channels', 'get_messages', 'get_thread_root', 'list_thread']) {
  for (const failure of ['503', 'offline']) {
    test(action + ' preserves message, reply, and edit drafts through ' + failure + ' and recovery', async ({ page }) => {
      await fixture(page)
      await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
      const composer = page.getByRole('textbox', { name: 'Message', exact: true })
      const reply = page.getByRole('textbox', { name: 'Reply', exact: true })
      await composer.fill('Unsent channel draft')
      await reply.fill('Unsent thread draft')
      const message = page.getByRole('list', { name: 'Messages', exact: true }).getByRole('listitem').first()
      await message.getByRole('button', { name: 'Edit message', exact: true }).click()
      const editor = message.getByRole('textbox', { name: 'Edit message', exact: true })
      await editor.fill('Unsent edit')
      await page.route('**/actions/' + action, route => failure === 'offline' ? route.abort('failed') : route.fulfill({ status: 503, json: { error: 'unavailable' } }))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(page.getByRole('alert').filter({ hasText: failure === '503' ? '503' : /fetch/i }).first()).toBeVisible()
      await expect(composer).toHaveValue('Unsent channel draft')
      await expect(reply).toHaveValue('Unsent thread draft')
      await expect(editor).toHaveValue('Unsent edit')
      await page.unroute('**/actions/' + action)
      const recovered = page.waitForResponse(response => response.url().endsWith('/actions/' + action) && response.ok())
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await recovered
      await expect(page.getByRole('alert')).toHaveCount(0)
      await expect(composer).toHaveValue('Unsent channel draft')
      await expect(reply).toHaveValue('Unsent thread draft')
      await expect(editor).toHaveValue('Unsent edit')
    })
  }
}

for (const action of ['workspace_list', 'get_channels', 'get_thread_root']) {
  for (const refusal of ['empty', '403']) {
    test(action + ' clears private drafts after ' + refusal + ' access loss and recovery', async ({ page }) => {
      await fixture(page)
      await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
      await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Private channel draft')
      await page.getByRole('textbox', { name: 'Reply', exact: true }).fill('Private reply draft')
      await page.route('**/actions/' + action, route => route.fulfill(refusal === '403' ? { status: 403, json: { error: 'forbidden' } } : { json: { rows: [] } }))
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(page.getByRole('textbox', { name: 'Reply', exact: true })).toHaveCount(0)
      if (action !== 'get_thread_root') await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveCount(0)
      await page.unroute('**/actions/' + action)
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      if (action !== 'get_thread_root') {
        await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('')
        await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
      }
      await expect(page.getByRole('textbox', { name: 'Reply', exact: true })).toHaveValue('')
    })
  }
}

test('confirmed sign-out discards channel and thread drafts', async ({ page }) => {
  await fixture(page)
  await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Private channel draft')
  await page.getByRole('textbox', { name: 'Reply', exact: true }).fill('Private reply draft')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
})


test('polling preserves reply edits on 503 then clears drafts on channel membership revocation', async ({ page }) => {
  await page.clock.install()
  const state = await fixture(page)
  state.messages.push({ ...state.messages[0]!, id: 'reply', parent_id: 'initial', body: 'Existing reply', content: 'Existing reply' })
  await page.getByRole('button', { name: 'Reply in thread (0)', exact: true }).click()
  const thread = page.getByRole('region', { name: 'Thread', exact: true })
  const reply = thread.getByRole('textbox', { name: 'Reply', exact: true })
  await reply.fill('Private reply draft')
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Private channel draft')
  await thread.getByRole('button', { name: 'Edit message', exact: true }).click()
  const editor = thread.getByRole('textbox', { name: 'Edit message', exact: true })
  await editor.fill('Private reply edit')
  await page.route('**/actions/list_thread', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }))
  await page.clock.fastForward(10000)
  await expect(thread.getByRole('alert')).toContainText('503')
  await expect(editor).toHaveValue('Private reply edit')
  await expect(reply).toHaveValue('Private reply draft')
  await page.unroute('**/actions/list_thread')
  await page.clock.fastForward(10000)
  await expect(thread.getByRole('alert')).toHaveCount(0)
  await expect(editor).toHaveValue('Private reply edit')
  state.channels[0]!.is_member = 0
  await page.clock.fastForward(10000)
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveCount(0)
  await expect(thread).toHaveCount(0)
  state.channels[0]!.is_member = 1
  await page.clock.fastForward(10000)
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Reply in thread (1)', exact: true }).click()
  await expect(reply).toHaveValue('')
  await expect(thread.getByRole('textbox', { name: 'Edit message', exact: true })).toHaveCount(0)
})

test('401 from a refresh confirms sign-out and discards private context', async ({ page }) => {
  await fixture(page)
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Private draft')
  await page.route('**/actions/workspace_list', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByText('<script>plain text</script>', { exact: true })).toHaveCount(0)
})

test('reduced motion responds to preference changes without press scaling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await fixture(page)
  const button = page.getByRole('button', { name: '+ New Channel', exact: true })
  await expect(button).not.toHaveCSS('transition-duration', '0s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(button).toHaveCSS('transition-duration', '0s')
  await button.hover()
  await page.mouse.down()
  await expect(button).toHaveCSS('transform', 'none')
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(button).not.toHaveCSS('transition-duration', '0s')
})

test('forced colors exposes message actions and preserves dialog keyboard focus', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await fixture(page)
  const actions = page.locator('.message-actions').first()
  await expect(actions).toHaveCSS('opacity', '1')
  await expect(page.locator('body')).toHaveCSS('background-image', 'none')
  const create = page.getByRole('button', { name: '+ New Channel', exact: true })
  await create.focus()
  await expect(create).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'New channel' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCSS('border-top-style', 'solid')
  await page.keyboard.press('Escape')
  await expect(create).toBeFocused()
  await page.emulateMedia({ forcedColors: 'none' })
  await page.getByRole('heading', { name: 'Slackie', exact: true }).hover()
  await expect(actions).toHaveCSS('opacity', '0')
})
