// One example per component for the documentation site (scripts/docs.mjs). Each entry is a
// function component; the docs page shows the function's body as the "React" code and renders
// it with react-dom/server for the live example — so keep each body self-contained and short.
// Dates are fixed (the generator also pins `new Date()`), so the pages do not change daily.
import {
  Accordion,
  AccordionItem,
  Alert,
  AppBar,
  AreaChart,
  Avatar,
  AvatarGroup,
  Badge,
  Banner,
  BarChart,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Calendar,
  Callout,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Chip,
  CidrInput,
  Code,
  CodeBlock,
  CollapsibleShell,
  ColorInput,
  Combobox,
  CommandPalette,
  ConfirmProvider,
  ContextMenu,
  createShortcutRegistry,
  CronInput,
  DataTable,
  DatePicker,
  DateRangePicker,
  DensityProvider,
  DescriptionList,
  DetailLayout,
  DetailSection,
  Dialog,
  DiffView,
  Divider,
  DonutChart,
  Dot,
  Dropdown,
  DropZone,
  EmptyState,
  ErrorPage,
  ErrorSummary,
  FieldShell,
  FileItem,
  FileList,
  Form,
  Gauge,
  Grid,
  Heatmap,
  Icon,
  IconButton,
  Illustration,
  IpInput,
  JsonInspector,
  Kbd,
  KeyValueEditor,
  LineChart,
  List,
  ListItem,
  LogViewer,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Meter,
  MultiSelect,
  Nav,
  NavItem,
  NavSection,
  NotificationCenter,
  NotificationPanel,
  NumberInput,
  OtpInput,
  PageHeader,
  Pagination,
  Paper,
  PasswordInput,
  Popover,
  Progress,
  QueryBuilder,
  Radio,
  RadioGroup,
  Row,
  SaveBar,
  Segmented,
  Select,
  Shell,
  ShellNavItem,
  ShellToggle,
  ShortcutsOverlay,
  ShortcutsProvider,
  Sidebar,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonText,
  Slider,
  Sparkline,
  Spinner,
  SplitPane,
  Stack,
  Stat,
  StatusDot,
  Stepper,
  Switch,
  Table,
  TablePagination,
  Tabs,
  TagInput,
  TextField,
  ThemeProvider,
  Timeline,
  ToastProvider,
  Toolbar,
  ToolbarLabel,
  ToolbarSeparator,
  Tooltip,
  TreeView,
  Typography,
  useForm,
  useShortcut,
  useToast,
  validators,
  VirtualTable,
  Wizard,
} from "../src/index";

const noop = () => {};

export const examples = {
  /* ------------------------------------------------------------------ Inputs */

  Button: () => (
    <Row gap={2} wrap>
      <Button>Deploy</Button>
      <Button variant="outline" color="neutral">Cancel</Button>
      <Button variant="soft" color="success">Approve</Button>
      <Button variant="ghost" color="danger">Delete</Button>
      <Button loading>Saving</Button>
      <Button size="sm" startIcon={<Icon name="plus" />}>New rule</Button>
    </Row>
  ),
  IconButton: () => (
    <Row gap={1}>
      <IconButton label="Settings" tooltip><Icon name="settings" /></IconButton>
      <IconButton label="Refresh" variant="outline"><Icon name="refresh" /></IconButton>
      <IconButton label="Delete" color="danger"><Icon name="trash" /></IconButton>
    </Row>
  ),
  ButtonGroup: () => (
    <ButtonGroup>
      <Button variant="outline" color="neutral">Day</Button>
      <Button variant="outline" color="neutral">Week</Button>
      <Button variant="outline" color="neutral">Month</Button>
    </ButtonGroup>
  ),
  Segmented: () => <Segmented options={["1h", "24h", "7d", "30d"]} value="24h" onChange={noop} />,
  TextField: () => (
    <Stack gap={3} style={{ maxWidth: 360 }}>
      <TextField label="Service name" placeholder="bothandler-edge" required help="Lowercase, digits and dashes." />
      <TextField label="Timeout" defaultValue="2500" suffix="ms" />
      <TextField label="Port" defaultValue="99999" error="Must be between 1 and 65535." />
    </Stack>
  ),
  Select: () => (
    <div style={{ maxWidth: 280 }}>
      <Select label="Region" options={["eu-central-1", "eu-west-1", "us-east-1"]} defaultValue="eu-west-1" />
    </div>
  ),
  Checkbox: () => (
    <Stack gap={2}>
      <Checkbox label="Log blocked requests" defaultChecked />
      <Checkbox label="Partially selected" indeterminate />
      <Checkbox label="Disabled" disabled />
    </Stack>
  ),
  Radio: () => (
    <Stack gap={2}>
      <Radio name="mode" label="Monitor only" defaultChecked />
      <Radio name="mode" label="Block" />
    </Stack>
  ),
  RadioGroup: () => (
    <RadioGroup label="Mode" name="mode" value="challenge" onChange={noop}>
      <Radio value="monitor" label="Monitor only" />
      <Radio value="challenge" label="Challenge" />
      <Radio value="block" label="Block" />
    </RadioGroup>
  ),
  Switch: () => (
    <Stack gap={2}>
      <Switch label="Enabled" defaultChecked />
      <Switch label="Kill switch" color="danger" />
    </Stack>
  ),
  Slider: () => (
    <div style={{ maxWidth: 320 }}>
      <Slider aria-label="Threshold" min={0} max={100} defaultValue={60} />
    </div>
  ),
  NumberInput: () => <NumberInput aria-label="Replicas" defaultValue={3} min={1} max={12} unit="nodes" />,
  TagInput: () => (
    <div style={{ maxWidth: 420 }}>
      <TagInput defaultValue={["eu-central-1", "eu-west-1"]} placeholder="Add region…" inputLabel="Regions" />
    </div>
  ),
  Combobox: () => (
    <div style={{ maxWidth: 320 }}>
      <Combobox aria-label="Service" placeholder="Pick a service…" options={["bothandler-edge", "hackerpot", "minisiem-ingest", "notify"]} />
    </div>
  ),
  DropZone: () => <DropZone onFiles={noop} accept=".json,.toml" multiple title="Drop config files here" hint="JSON or TOML, up to 1 MB" />,
  FileList: () => (
    <FileList>
      <FileItem name="rules-edge-v14.json" size={48_213} progress={100} onRemove={noop} />
      <FileItem name="nodes.toml" size={2_048} progress={45} onRemove={noop} />
    </FileList>
  ),
  FileItem: () => (
    <FileList>
      <FileItem name="backup-2026-10-24.tar.gz" size={7_340_032} error="Larger than 5 MB" onRemove={noop} />
    </FileList>
  ),
  DatePicker: () => <DatePicker aria-label="Start date" value={new Date(2026, 9, 25)} onChange={noop} clearable />,
  DateRangePicker: () => (
    <DateRangePicker aria-label="Period" value={{ from: new Date(2026, 9, 18), to: new Date(2026, 9, 25) }} onChange={noop} />
  ),
  Calendar: () => (
    <Calendar month={new Date(2026, 9, 1)} selected={new Date(2026, 9, 25)} onMonthChange={noop} onSelect={noop} />
  ),

  /* ------------------------------------------------------------------- Forms */

  Form: () => {
    const form = useForm({
      initialValues: { name: "edge-production", port: "9110" },
      rules: { name: [validators.required()], port: [validators.required(), validators.port()] },
      onSubmit: async () => {},
    });
    return (
      <Form form={form}>
        <Stack gap={3} style={{ maxWidth: 360 }}>
          <TextField label="Project name" {...form.field("name")} />
          <TextField label="Port" {...form.field("port")} />
          <Row gap={2}><Button type="submit">Save</Button></Row>
        </Stack>
      </Form>
    );
  },
  FieldShell: () => (
    <FieldShell id="accent" label="Accent colour" help="Any control can sit in the shared label/help/error frame.">
      <input id="accent" className="oq-input" defaultValue="#78dce8" style={{ maxWidth: 200 }} />
    </FieldShell>
  ),
  ErrorSummary: () => {
    const form = useForm({
      initialValues: { name: "", port: "99999" },
      rules: { name: [validators.required()], port: [validators.port()] },
      onSubmit: async () => {},
    });
    return (
      <Form form={form}>
        <ErrorSummary title="Fix these fields before saving" />
      </Form>
    );
  },
  SaveBar: () => <SaveBar open sticky={false} onSave={noop} onDiscard={noop} message="3 unsaved changes" />,
  MultiSelect: () => (
    <div style={{ maxWidth: 360 }}>
      <MultiSelect label="Regions" options={["eu-central-1", "eu-west-1", "us-east-1", "ap-south-1"]} defaultValue={["eu-central-1", "us-east-1"]} />
    </div>
  ),
  ColorInput: () => <ColorInput label="Brand colour" defaultValue="#ab9df2" />,
  PasswordInput: () => (
    <div style={{ maxWidth: 320 }}>
      <PasswordInput label="New password" defaultValue="correct-horse-battery" showStrength />
    </div>
  ),
  OtpInput: () => <OtpInput label="Verification code" length={6} defaultValue="4821" groupSize={3} />,
  CronInput: () => <CronInput label="Schedule" defaultValue="0 2 * * 1-5" showRuns={3} now={new Date(Date.UTC(2026, 9, 25, 10))} utc />,
  KeyValueEditor: () => (
    <div style={{ maxWidth: 520 }}>
      <KeyValueEditor
        label="Response headers"
        mono
        defaultValue={[
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Frame-Options", value: "DENY" },
        ]}
      />
    </div>
  ),
  IpInput: () => (
    <div style={{ maxWidth: 320 }}>
      <IpInput label="Upstream address" defaultValue="10.0.12.7" />
    </div>
  ),
  CidrInput: () => (
    <div style={{ maxWidth: 320 }}>
      <CidrInput label="Trusted network" defaultValue="10.0.0.0/8" version={4} />
    </div>
  ),
  QueryBuilder: () => (
    <QueryBuilder
      label="Filter"
      fields={[
        { name: "status", type: "enum", options: ["open", "closed"] },
        { name: "region", type: "enum", options: ["eu", "us"] },
        { name: "p95", type: "number" },
      ]}
      defaultValue={[
        { field: "status", op: "eq", value: "open" },
        { field: "p95", op: "gt", value: 250 },
      ]}
    />
  ),
  Wizard: () => (
    <Wizard
      onFinish={noop}
      steps={[
        { label: "Source", content: <TextField label="Repository" defaultValue="osqd/bothandler" /> },
        { label: "Rules", content: <Checkbox label="Include default rules" defaultChecked /> },
        { label: "Review", content: <Typography color="muted">Everything looks good.</Typography> },
      ]}
    />
  ),
  ConfirmProvider: () => (
    <ConfirmProvider>
      <Button color="danger" variant="outline">Delete node…</Button>
    </ConfirmProvider>
  ),

  /* ------------------------------------------------------------ Data display */

  Card: () => (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader title="Edge node fra-02" subtitle="Last heartbeat 4 s ago" actions={<Chip color="success">online</Chip>} />
      <CardBody>
        <DescriptionList items={{ Version: "0.14.2", Address: "10.0.12.7:9110", Store: "redis · 3 replicas" }} />
      </CardBody>
      <CardFooter>
        <Button variant="ghost" color="neutral">Logs</Button>
        <Button>Open</Button>
      </CardFooter>
    </Card>
  ),
  CardHeader: () => (
    <Card style={{ maxWidth: 420 }}>
      <CardHeader title="Recent events" subtitle="Last 24 hours" actions={<Button size="sm" variant="ghost" color="neutral">View all</Button>} />
    </Card>
  ),
  CardBody: () => (
    <Card style={{ maxWidth: 420 }}>
      <CardBody>Padded content. Use <Code>flush</Code> for tables and lists that run edge to edge.</CardBody>
    </Card>
  ),
  CardFooter: () => (
    <Card style={{ maxWidth: 420 }}>
      <CardBody>Delete this node?</CardBody>
      <CardFooter>
        <Button variant="ghost" color="neutral">Cancel</Button>
        <Button color="danger">Delete</Button>
      </CardFooter>
    </Card>
  ),
  Paper: () => (
    <Row gap={3} wrap>
      <Paper padding={4}>Outlined</Paper>
      <Paper padding={4} variant="raised">Raised</Paper>
      <Paper padding={4} variant="flat">Flat</Paper>
    </Row>
  ),
  Stat: () => (
    <Grid min={180}>
      <Stat label="Requests / min" value="12 480" delta="▲ 8.2 % vs last hour" trend="up" />
      <Stat label="p95 latency" value="84" unit="ms" delta="— unchanged" />
    </Grid>
  ),
  Chip: () => (
    <Row gap={1} wrap>
      <Chip color="success">healthy</Chip>
      <Chip color="warning" variant="solid">429</Chip>
      <Chip color="secondary" variant="outline">beta</Chip>
      <Chip color="primary" onDelete={noop}>region:eu</Chip>
      <Chip color="neutral" selected clickable>Errors</Chip>
    </Row>
  ),
  Badge: () => (
    <Row gap={6}>
      <Badge count={12} color="danger"><Button variant="outline" color="neutral">Inbox</Button></Badge>
      <Badge count={7} />
      <Badge count={140} max={99} color="warning" />
    </Row>
  ),
  Dot: () => (
    <Row gap={3}>
      <Dot color="success" pulse />
      <Dot color="warning" />
      <Dot color="danger" />
    </Row>
  ),
  StatusDot: () => (
    <Stack gap={2}>
      <StatusDot color="success" pulse label="Operational" />
      <StatusDot color="warning" label="Degraded" />
      <StatusDot color="danger" label="Down" />
    </Stack>
  ),
  Avatar: () => (
    <Row gap={2}>
      <Avatar name="Michał Płatosz" size="sm" />
      <Avatar name="Anna Kowalska" color="secondary" />
      <Avatar name="CI Deployer" color="warning" square size="lg" />
    </Row>
  ),
  AvatarGroup: () => (
    <AvatarGroup max={3}>
      <Avatar name="Anna Nowak" color="success" />
      <Avatar name="Bartek Kos" color="info" />
      <Avatar name="Celina Lis" color="secondary" />
      <Avatar name="Dawid Mazur" />
      <Avatar name="Ewa Wójcik" />
    </AvatarGroup>
  ),
  List: () => (
    <Card style={{ maxWidth: 460 }}>
      <List hover>
        <ListItem start={<Dot color="danger" />} primary="Blocked 41 requests" secondary="detector: tor-exit" meta="2 min" />
        <ListItem start={<Dot color="success" />} primary="Ruleset edge-v14 deployed" secondary="6 of 6 nodes" meta="1 h" />
      </List>
    </Card>
  ),
  ListItem: () => (
    <Card style={{ maxWidth: 460 }}>
      <List>
        <ListItem start={<Avatar name="Michał Płatosz" />} primary="Michał P." secondary="Owner" meta={<Chip size="sm">admin</Chip>} />
      </List>
    </Card>
  ),
  DescriptionList: () => (
    <DescriptionList
      items={[
        ["Version", <Code key="v">0.14.2</Code>],
        ["Region", "eu-central-1"],
        ["Uptime", "31 days"],
      ]}
    />
  ),
  Accordion: () => (
    <Accordion style={{ maxWidth: 520 }}>
      <AccordionItem title="What does “monitor only” do?" defaultOpen>Detectors run and findings are logged, but nothing is blocked.</AccordionItem>
      <AccordionItem title="Can I reload without a restart?">Yes — SIGHUP or the Reload button.</AccordionItem>
    </Accordion>
  ),
  AccordionItem: () => (
    <Accordion style={{ maxWidth: 520 }}>
      <AccordionItem title="Where is the config file?" defaultOpen>
        <Code>/etc/osqd/config.toml</Code>, or the path in <Code>OSQD_CONFIG</Code>.
      </AccordionItem>
    </Accordion>
  ),
  Timeline: () => (
    <Timeline
      items={[
        { title: "Deploy started", time: "11:02", body: "edge-v14 to 6 nodes", color: "primary" },
        { title: "fra-03 failed health check", time: "11:04", color: "danger", filled: true },
        { title: "Rolled back fra-03", time: "11:05", color: "warning" },
        { title: "Deploy finished", time: "11:09", color: "success" },
      ]}
    />
  ),
  CodeBlock: () => (
    <CodeBlock
      language="toml"
      filename="config.toml"
      lineNumbers
      highlight={[3]}
      code={`[server]\nport = 9110\nmode = "challenge"\ntimeout_ms = 2500`}
    />
  ),
  EmptyState: () => (
    <Paper>
      <EmptyState
        icon={<Icon name="inbox" size={36} />}
        title="No alerts yet"
        description="Rules you create will show up here."
        action={<Button size="sm">Create rule</Button>}
      />
    </Paper>
  ),
  TreeView: () => (
    <TreeView
      defaultExpanded={["src", "src/react"]}
      defaultSelected="src/react/Button.tsx"
      nodes={[
        {
          id: "src",
          label: "src",
          children: [
            {
              id: "src/react",
              label: "react",
              children: [
                { id: "src/react/Button.tsx", label: "Button.tsx", meta: "3 KB" },
                { id: "src/react/Form.tsx", label: "Form.tsx", meta: "9 KB" },
              ],
            },
            { id: "src/theme", label: "theme", children: [{ id: "src/theme/index.ts", label: "index.ts" }] },
          ],
        },
        { id: "package.json", label: "package.json", meta: "2 KB" },
      ]}
    />
  ),

  /* -------------------------------------------------------------------- Data */

  Table: () => (
    <Table dense hover>
      <thead>
        <tr><th>Node</th><th>Status</th><th className="oq-num">Req/s</th></tr>
      </thead>
      <tbody>
        <tr><td>fra-01</td><td><StatusDot color="success" label="healthy" /></td><td className="oq-num">2,310</td></tr>
        <tr><td>fra-03</td><td><StatusDot color="warning" label="degraded" /></td><td className="oq-num">980</td></tr>
      </tbody>
    </Table>
  ),
  DataTable: () => (
    <DataTable
      selectable
      defaultSort={{ key: "rps", direction: "desc" }}
      columns={[
        { key: "name", header: "Service", sortable: true, mono: true },
        { key: "region", header: "Region" },
        { key: "rps", header: "Req/s", align: "right", sortable: true },
      ]}
      rows={[
        { id: 1, name: "bothandler-edge", region: "eu-central-1", rps: 4210 },
        { id: 2, name: "hackerpot", region: "eu-west-1", rps: 812 },
        { id: 3, name: "minisiem-ingest", region: "us-east-1", rps: 2290 },
      ]}
    />
  ),
  TablePagination: () => <TablePagination page={3} count={312} rowsPerPage={20} onPageChange={noop} onRowsPerPageChange={noop} />,
  VirtualTable: () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({
      id: i + 1,
      host: `node-${i + 1}`,
      rps: (i * 7919) % 5000,
    }));
    return (
      <VirtualTable
        height={260}
        rows={rows}
        columns={[
          { key: "id", header: "#", width: 90, align: "right" },
          { key: "host", header: "Host", width: 200, mono: true },
          { key: "rps", header: "Req/s", width: 120, align: "right", editable: true },
        ]}
      />
    );
  },
  LogViewer: () => (
    <LogViewer
      height={220}
      lines={[
        { time: Date.UTC(2026, 9, 25, 11, 2, 14), level: "info", source: "reload", message: "3 keys changed" },
        { time: Date.UTC(2026, 9, 25, 11, 4, 51), level: "warn", source: "ratelim", message: "/api/login 30/60s reached" },
        { time: Date.UTC(2026, 9, 25, 11, 5, 2), level: "error", source: "store", message: "ECONNREFUSED 10.0.0.4:6379" },
        { time: Date.UTC(2026, 9, 25, 11, 5, 9), level: "debug", source: "store", message: "retry in 2000 ms" },
      ]}
    />
  ),
  JsonInspector: () => (
    <JsonInspector
      defaultExpandDepth={2}
      value={{
        request: { method: "POST", path: "/api/login", headers: { "user-agent": "curl/8.4", "x-forwarded-for": "185.220.101.4" } },
        score: 72,
        findings: ["tor-exit", "rate"],
        blocked: true,
      }}
    />
  ),
  DiffView: () => (
    <DiffView
      oldLabel="edge-v13"
      newLabel="edge-v14"
      oldText={`[server]\nport = 9110\nmode = "monitor"\ntimeout_ms = 2500`}
      newText={`[server]\nport = 9110\nmode = "challenge"\ntimeout_ms = 3000`}
    />
  ),

  /* ------------------------------------------------------------------ Charts */

  BarChart: () => (
    <BarChart
      label="Requests by region"
      height={220}
      x="region"
      series={[
        { key: "allowed", label: "Allowed" },
        { key: "blocked", label: "Blocked" },
      ]}
      data={[
        { region: "eu-central", allowed: 4210, blocked: 312 },
        { region: "eu-west", allowed: 1650, blocked: 140 },
        { region: "us-east", allowed: 3020, blocked: 512 },
        { region: "ap-south", allowed: 980, blocked: 96 },
      ]}
    />
  ),
  LineChart: () => (
    <LineChart
      label="p95 latency over the day"
      height={220}
      x="hour"
      series={[{ key: "p95", label: "p95 ms" }]}
      data={[0, 3, 6, 9, 12, 15, 18, 21].map((h, i) => ({ hour: `${h}:00`, p95: [62, 58, 71, 96, 88, 104, 92, 70][i] }))}
    />
  ),
  AreaChart: () => (
    <AreaChart
      label="Traffic, stacked"
      height={220}
      stacked
      x="hour"
      series={[
        { key: "allowed", label: "Allowed" },
        { key: "blocked", label: "Blocked" },
      ]}
      data={[0, 4, 8, 12, 16, 20].map((h, i) => ({ hour: `${h}:00`, allowed: [120, 90, 210, 260, 240, 170][i], blocked: [12, 8, 30, 44, 38, 20][i] }))}
    />
  ),
  DonutChart: () => (
    <DonutChart
      label="Requests by verdict"
      centerValue="12.5K"
      centerLabel="requests"
      data={[
        { key: "allow", label: "Allowed", value: 10_420 },
        { key: "challenge", label: "Challenged", value: 1_610 },
        { key: "block", label: "Blocked", value: 470 },
      ]}
    />
  ),
  Heatmap: () => (
    <Heatmap
      label="Requests per weekday and 4-hour block"
      rows={["Mon", "Tue", "Wed", "Thu", "Fri"]}
      columns={["00", "04", "08", "12", "16", "20"]}
      values={[
        [2, 1, 9, 14, 12, 6],
        [3, 1, 11, 15, 13, 5],
        [2, 2, 10, 16, 14, 7],
        [3, 1, 12, 13, 15, 6],
        [4, 2, 8, 11, 9, null],
      ]}
    />
  ),
  Sparkline: () => (
    <Row gap={6}>
      <Sparkline data={[4, 6, 5, 8, 7, 9, 12, 10, 13]} label="Requests" width={140} height={36} />
      <Sparkline data={[9, 7, 8, 5, 6, 4, 3]} area color="danger" label="Errors" width={140} height={36} />
    </Row>
  ),
  Meter: () => (
    <Stack gap={3} style={{ maxWidth: 360 }}>
      <Meter label="Disk" value={42} unit="%" low={60} high={85} optimum={20} />
      <Meter label="Memory" value={91} unit="%" low={60} high={85} optimum={20} />
    </Stack>
  ),
  Gauge: () => (
    <Row gap={6}>
      <Gauge label="CPU" value={38} unit="%" low={60} high={85} optimum={20} />
      <Gauge label="Error budget" value={12} unit="%" low={25} high={60} optimum={90} />
    </Row>
  ),

  /* -------------------------------------------------------------- Navigation */

  Tabs: () => (
    <Tabs
      defaultValue="overview"
      items={[
        { value: "overview", label: "Overview", content: <Typography color="muted">Overview panel.</Typography> },
        { value: "detectors", label: "Detectors", content: "Eight detectors are active." },
        { value: "billing", label: "Billing", disabled: true },
      ]}
    />
  ),
  Breadcrumbs: () => (
    <Breadcrumbs items={[{ label: "Projects", href: "#" }, { label: "BotHandler", href: "#" }, { label: "fra-02" }]} />
  ),
  Pagination: () => <Pagination page={7} count={65} onChange={noop} />,
  Stepper: () => (
    <Stepper
      active={1}
      steps={[
        { label: "Source", description: "Repository" },
        { label: "Rules", description: "Detectors" },
        { label: "Review" },
      ]}
    />
  ),
  AppBar: () => (
    <AppBar brand="Edge Monitor">
      <Breadcrumbs items={[{ label: "Production", href: "#" }, { label: "Overview" }]} />
      <div className="oq-spacer" />
      <Avatar name="Michał Płatosz" size="sm" />
    </AppBar>
  ),
  Nav: () => (
    <Nav style={{ maxWidth: 240 }}>
      <NavSection>Monitor</NavSection>
      <NavItem href="#" active icon={<Icon name="activity" />}>Overview</NavItem>
      <NavItem href="#" icon={<Icon name="server" />} end={<Badge count={6} color="neutral" />}>Nodes</NavItem>
      <NavItem href="#" icon={<Icon name="bell" />} end={<Badge count={3} color="danger" />}>Events</NavItem>
    </Nav>
  ),
  NavSection: () => (
    <Nav style={{ maxWidth: 240 }}>
      <NavSection>Manage</NavSection>
      <NavItem href="#">Settings</NavItem>
    </Nav>
  ),
  NavItem: () => (
    <Nav style={{ maxWidth: 240 }}>
      <NavItem href="#" active icon={<Icon name="home" />}>Home</NavItem>
      <NavItem href="#" icon={<Icon name="users" />}>Team</NavItem>
    </Nav>
  ),
  Toolbar: () => (
    <Toolbar label="Editor">
      <IconButton label="Undo"><Icon name="undo" /></IconButton>
      <IconButton label="Redo"><Icon name="redo" /></IconButton>
      <ToolbarSeparator />
      <ToolbarLabel>Zoom</ToolbarLabel>
      <IconButton label="Zoom out"><Icon name="zoom-out" /></IconButton>
      <IconButton label="Zoom in"><Icon name="zoom-in" /></IconButton>
    </Toolbar>
  ),
  ToolbarSeparator: () => (
    <Toolbar label="Formatting" flat>
      <Button size="sm" variant="ghost" color="neutral">Bold</Button>
      <ToolbarSeparator />
      <Button size="sm" variant="ghost" color="neutral">Link</Button>
    </Toolbar>
  ),
  ToolbarLabel: () => (
    <Toolbar label="View">
      <ToolbarLabel>Group by</ToolbarLabel>
      <Segmented options={["None", "Region", "Owner"]} value="Region" onChange={noop} />
    </Toolbar>
  ),

  /* ---------------------------------------------------------------- Overlays */

  Dialog: () => (
    <Dialog
      open
      onClose={noop}
      title="New detector"
      footer={
        <>
          <Button variant="ghost" color="neutral">Cancel</Button>
          <Button>Create</Button>
        </>
      }
    >
      <TextField label="Name" placeholder="burst-login" />
    </Dialog>
  ),
  Dropdown: () => (
    <Dropdown trigger={(props) => <Button variant="outline" color="neutral" {...props}>Actions</Button>}>
      <Menu>
        <MenuItem hint="↵">Open</MenuItem>
        <MenuItem danger>Delete…</MenuItem>
      </Menu>
    </Dropdown>
  ),
  Menu: () => (
    <Menu style={{ maxWidth: 240 }}>
      <MenuLabel>Node</MenuLabel>
      <MenuItem icon={<Icon name="external-link" />} hint="↵">Open</MenuItem>
      <MenuItem icon={<Icon name="copy" />} hint="Ctrl D">Duplicate</MenuItem>
      <MenuSeparator />
      <MenuItem icon={<Icon name="trash" />} danger>Delete…</MenuItem>
    </Menu>
  ),
  MenuItem: () => (
    <Menu style={{ maxWidth: 240 }}>
      <MenuItem icon={<Icon name="download" />} hint="Ctrl S">Export CSV</MenuItem>
      <MenuItem disabled>Move (locked)</MenuItem>
    </Menu>
  ),
  MenuSeparator: () => (
    <Menu style={{ maxWidth: 240 }}>
      <MenuItem>Rename</MenuItem>
      <MenuSeparator />
      <MenuItem danger>Delete</MenuItem>
    </Menu>
  ),
  MenuLabel: () => (
    <Menu style={{ maxWidth: 240 }}>
      <MenuLabel>Sort by</MenuLabel>
      <MenuItem>Name</MenuItem>
      <MenuItem>Last seen</MenuItem>
    </Menu>
  ),
  Popover: () => (
    <div style={{ paddingBottom: 150 }}>
      <Popover
        open
        placement="bottom"
        title="Share link"
        trigger={(props) => <Button variant="outline" color="neutral" {...props}>Share</Button>}
        actions={<Button size="sm">Copy link</Button>}
      >
        Anyone with the link can view this dashboard.
      </Popover>
    </div>
  ),
  Tooltip: () => (
    <Tooltip title="Restart the node">
      <Button variant="soft" color="neutral">Restart</Button>
    </Tooltip>
  ),
  CommandPalette: () => (
    <CommandPalette
      open
      onClose={noop}
      commands={[
        { id: "deploy", label: "Deploy ruleset", group: "Actions", shortcut: ["Ctrl", "D"], onSelect: noop },
        { id: "reload", label: "Reload config", group: "Actions", onSelect: noop },
        { id: "nodes", label: "Go to Nodes", group: "Navigation", onSelect: noop },
      ]}
    />
  ),
  ContextMenu: () => (
    <ContextMenu
      items={[
        { label: "Open", hint: "↵" },
        { label: "Copy ID" },
        "separator",
        { label: "Delete…", danger: true },
      ]}
    >
      <Paper padding={6}>Right-click (or Shift+F10) inside this box.</Paper>
    </ContextMenu>
  ),

  /* ---------------------------------------------------------------- Feedback */

  Alert: () => (
    <Stack gap={2}>
      <Alert color="warning" title="Threshold above cap">Detector <Code>burst</Code> can never fire.</Alert>
      <Alert color="danger" title="Store unreachable" actions={<Button size="sm" variant="outline" color="danger">Retry</Button>}>
        Falling back to the memory store.
      </Alert>
      <Alert color="success" onClose={noop}>Ruleset deployed to 6 nodes.</Alert>
    </Stack>
  ),
  Banner: () => (
    <Banner color="info" onClose={noop} actions={<Button size="sm" variant="ghost" color="neutral">Details</Button>}>
      Maintenance window: config reloads pause Sunday 02:00–03:00 UTC.
    </Banner>
  ),
  Callout: () => (
    <Stack gap={2}>
      <Callout kind="tip" title="Tip">Press <Kbd>?</Kbd> to see every shortcut.</Callout>
      <Callout kind="caution">Changing the port needs a restart.</Callout>
    </Stack>
  ),
  Progress: () => (
    <Stack gap={3} style={{ maxWidth: 360 }}>
      <Progress value={35} />
      <Progress value={80} color="success" size="lg" />
      <Progress />
    </Stack>
  ),
  Spinner: () => (
    <Row gap={3}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" color="warning" label="Syncing" />
    </Row>
  ),
  Skeleton: () => (
    <Row gap={3}>
      <Skeleton circle width={32} height={32} />
      <Stack gap={1} style={{ flex: 1, maxWidth: 260 }}>
        <Skeleton width="60%" />
        <Skeleton width="35%" height="0.8em" />
      </Stack>
    </Row>
  ),
  SkeletonText: () => <SkeletonText lines={3} style={{ maxWidth: 420 }} />,
  SkeletonList: () => <SkeletonList rows={3} avatar style={{ maxWidth: 420 }} />,
  SkeletonCard: () => <SkeletonCard media lines={2} actions style={{ maxWidth: 320 }} />,
  SkeletonTable: () => <SkeletonTable rows={4} cols={4} />,
  ToastProvider: () => {
    function SaveButton() {
      const toast = useToast();
      return <Button onClick={() => toast.show({ title: "Saved", color: "success" })}>Save</Button>;
    }
    return (
      <ToastProvider>
        <SaveButton />
      </ToastProvider>
    );
  },
  NotificationCenter: () => (
    <NotificationCenter
      now={new Date(Date.UTC(2026, 9, 25, 12))}
      items={[
        { id: "1", title: "fra-03 is degraded", body: "p95 above 400 ms", time: Date.UTC(2026, 9, 25, 11, 50), color: "warning" },
        { id: "2", title: "Ruleset deployed", time: Date.UTC(2026, 9, 24, 16), read: true },
      ]}
    />
  ),
  NotificationPanel: () => (
    <NotificationPanel
      inline
      now={new Date(Date.UTC(2026, 9, 25, 12))}
      viewAllHref="#"
      items={[
        { id: "1", title: "fra-03 is degraded", body: "p95 above 400 ms", time: Date.UTC(2026, 9, 25, 11, 50), color: "warning" },
        { id: "2", title: "Blocked 41 requests", time: Date.UTC(2026, 9, 25, 9, 12), color: "danger" },
        { id: "3", title: "Ruleset deployed", time: Date.UTC(2026, 9, 24, 16), read: true },
      ]}
    />
  ),
  ErrorPage: () => <ErrorPage variant="404" actions={<Button>Go home</Button>} />,

  /* ------------------------------------------------------------------ Layout */

  Stack: () => (
    <Stack gap={2} style={{ maxWidth: 240 }}>
      <Paper padding={3}>One</Paper>
      <Paper padding={3}>Two</Paper>
      <Paper padding={3}>Three</Paper>
    </Stack>
  ),
  Row: () => (
    <Row gap={2} justify="space-between">
      <Typography variant="h5">Nodes</Typography>
      <Row gap={1}>
        <Button size="sm" variant="outline" color="neutral">Refresh</Button>
        <Button size="sm">Add node</Button>
      </Row>
    </Row>
  ),
  Grid: () => (
    <Grid min={140} gap={2}>
      {["fra-01", "fra-02", "fra-03", "dub-01", "iad-01"].map((n) => (
        <Paper key={n} padding={3}>{n}</Paper>
      ))}
    </Grid>
  ),
  Shell: () => (
    <div style={{ height: 260, overflow: "hidden", border: "1px solid var(--oq-border)", borderRadius: 8 }}>
      <Shell
        style={{ minHeight: 0, height: "100%" }}
        appBar={<AppBar brand="Edge Monitor" />}
        sidebar={
          <Sidebar>
            <Nav>
              <NavItem href="#" active>Overview</NavItem>
              <NavItem href="#">Nodes</NavItem>
            </Nav>
          </Sidebar>
        }
      >
        <Typography variant="h4">Overview</Typography>
      </Shell>
    </div>
  ),
  Sidebar: () => (
    <div style={{ height: 200, display: "flex" }}>
      <Sidebar style={{ width: 220 }}>
        <Nav>
          <NavSection>Monitor</NavSection>
          <NavItem href="#" active>Overview</NavItem>
          <NavItem href="#">Events</NavItem>
        </Nav>
      </Sidebar>
    </div>
  ),
  CollapsibleShell: () => (
    <div style={{ height: 260, overflow: "hidden", border: "1px solid var(--oq-border)", borderRadius: 8 }}>
      <CollapsibleShell
        defaultRail
        style={{ minHeight: 0, height: "100%" }}
        appBar={<AppBar brand={<><ShellToggle /> Edge Monitor</>} />}
        sidebar={
          <Nav>
            <ShellNavItem href="#" label="Overview" icon={<Icon name="activity" />} active />
            <ShellNavItem href="#" label="Nodes" icon={<Icon name="server" />} />
          </Nav>
        }
      >
        <Typography variant="h4">Overview</Typography>
      </CollapsibleShell>
    </div>
  ),
  ShellToggle: () => (
    <CollapsibleShell style={{ minHeight: 0 }} appBar={<AppBar brand={<><ShellToggle /> Edge Monitor</>} />} sidebar={<Nav />}>
      {null}
    </CollapsibleShell>
  ),
  ShellNavItem: () => (
    <CollapsibleShell
      style={{ minHeight: 0, height: 140 }}
      sidebar={
        <Nav>
          <ShellNavItem href="#" label="Overview" icon={<Icon name="home" />} active />
          <ShellNavItem href="#" label="Events" icon={<Icon name="bell" />} end={<Badge count={3} color="danger" />} />
        </Nav>
      }
    >
      {null}
    </CollapsibleShell>
  ),
  SplitPane: () => (
    <div style={{ height: 220, border: "1px solid var(--oq-border)", borderRadius: 8, overflow: "hidden" }}>
      <SplitPane defaultSize={35} min={20} max={70} collapsible>
        <div className="oq-p-4">Files</div>
        <div className="oq-p-4">Editor</div>
      </SplitPane>
    </div>
  ),
  PageHeader: () => (
    <PageHeader
      breadcrumbs={<Breadcrumbs items={[{ label: "Nodes", href: "#" }, { label: "fra-02" }]} />}
      title="fra-02"
      status={<Chip color="success">online</Chip>}
      subtitle="Edge node in eu-central-1"
      meta={["v0.14.2", "up 31 days"]}
      actions={
        <>
          <Button variant="outline" color="neutral">Restart</Button>
          <Button>Open</Button>
        </>
      }
    />
  ),
  DetailLayout: () => (
    <DetailLayout
      header={<PageHeader title="OSQD-221" subtitle="Reload ignores changed port" level={2} />}
      aside={
        <DetailSection title="Properties">
          <DescriptionList items={{ Status: "In progress", Priority: "P1", Assignee: "MP" }} />
        </DetailSection>
      }
    >
      <DetailSection title="Description">A SIGHUP reload with a new port keeps listening on the old one.</DetailSection>
    </DetailLayout>
  ),
  DetailSection: () => (
    <DetailSection title="Activity">
      <Timeline items={[{ title: "Moved to In progress", time: "2 h ago" }]} />
    </DetailSection>
  ),
  Divider: () => (
    <Stack gap={2} style={{ maxWidth: 420 }}>
      <Typography>Above</Typography>
      <Divider />
      <Divider label="or" />
      <Row gap={2}>Left <Divider vertical /> Right</Row>
    </Stack>
  ),

  /* -------------------------------------------------------------- Typography */

  Typography: () => (
    <Stack gap={1}>
      <Typography variant="overline">Overview</Typography>
      <Typography variant="h3">Request pipeline</Typography>
      <Typography>Body text with tabular numbers: 1 204 ms, 98.6 %.</Typography>
      <Typography variant="small" color="muted">Updated 4 s ago</Typography>
      <Typography variant="small" mono>osqd_live_9f2c…a71e</Typography>
    </Stack>
  ),
  Kbd: () => (
    <Typography>
      Open the command palette with <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>.
    </Typography>
  ),
  Code: () => (
    <Typography>
      Set <Code>OSQD_CONFIG</Code> to point at another file.
    </Typography>
  ),

  /* ------------------------------------------------------------------- Theme */

  ThemeProvider: () => (
    <Row gap={3} wrap>
      <ThemeProvider theme="paper" className="oq-p-4" style={{ borderRadius: 8 }}>
        <Button>Paper</Button>
      </ThemeProvider>
      <ThemeProvider theme="midnight" className="oq-p-4" style={{ borderRadius: 8 }}>
        <Button>Midnight</Button>
      </ThemeProvider>
    </Row>
  ),
  DensityProvider: () => (
    <Row gap={3} wrap>
      <DensityProvider density="compact"><Button>Compact</Button></DensityProvider>
      <DensityProvider density="comfortable"><Button>Comfortable</Button></DensityProvider>
    </Row>
  ),
  ShortcutsProvider: () => {
    function SaveShortcut() {
      useShortcut({ keys: "mod+s", label: "Save", group: "Editing", handler: () => {} });
      return <Typography color="muted">Press <Kbd>?</Kbd> to list shortcuts.</Typography>;
    }
    return (
      <ShortcutsProvider>
        <SaveShortcut />
      </ShortcutsProvider>
    );
  },
  ShortcutsOverlay: () => {
    const registry = createShortcutRegistry();
    registry.register({ keys: "mod+k", label: "Command palette", group: "General" });
    registry.register({ keys: "?", label: "Show shortcuts", group: "General" });
    registry.register({ keys: "g n", label: "Go to Nodes", group: "Navigation" });
    return <ShortcutsOverlay open onClose={noop} registry={registry} />;
  },

  /* ------------------------------------------------------------------- Icons */

  Icon: () => (
    <Row gap={3}>
      <Icon name="search" />
      <Icon name="server" size={20} />
      <Icon name="shield-check" size={24} color="success" />
      <Icon name="bug" size={24} color="danger" title="Bug" />
    </Row>
  ),
  Illustration: () => (
    <Row gap={6} wrap>
      <Illustration name="empty-inbox" width={160} />
      <Illustration name="no-results" width={160} />
    </Row>
  ),
} satisfies Record<string, () => unknown>;
