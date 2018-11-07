const StartPage = require('../lib/start-page')
const URL = require('url')

const html = new StartPage()
const {
  h1, h2, section, table, tr, td, th, link, img, ul, li
} = StartPage.nodes

const gitlabBaseUrl = 'https://git.nexus.commercehub.com'
const gitlabFaviconUrl = `${gitlabBaseUrl}/favicon.ico`
const gitlabFaviconImg = img({
  src: gitlabFaviconUrl,
  width: 32,
  height: 32,
  alt: 'GitLab favicon'
})

const devOpsTools = [
  {
    name: 'Sumologic',
    url: 'http://sumo.commercehub.com',
    logoUrl: 'https://service.us2.sumologic.com/favicon.ico'
  },
  {
    name: 'AWS console',
    url: 'http://aws.commercehub.com',
    logoUrl: 'https://console.aws.amazon.com/favicon.ico'
  },
  {
    name: 'Pagerduty',
    url: 'https://commercehub.pagerduty.com'
  },
  {
    name: 'Uchiwa',
    logoUrl: '/bower_components/uchiwa-web/favicon.ico',
    envs: {
      nonprod: {
        url: 'http://sensu.nexus.commercehub.com'
      },
      prod: {
        url: 'http://sensuprod.commercehub.com'
      }
    }
  }
]

const boarEnvs = [
  {
    name: 'dev01',
    color: 'green',
    rootUrl: 'https://dev01.internal-nonprod01.boar.chnonprod.net'
  },
  {
    name: 'int01',
    color: 'yellow',
    rootUrl: 'https://int01.internal-nonprod01.boar.chnonprod.net'
  },
  {
    name: 'prod01',
    color: 'red',
    rootUrl: 'https://prod01.internal-prod01.boar.chprod.net'
  }
]

const boarApps = [
  {
    name: 'napolean',
    entryUrl: '/napolean/health'
  },
  {
    name: 'circe',
    entryUrl: '/circe-source/health'
  },
  {
    name: 'pigpen',
    entryUrl: '/pigpen/health'
  }
]

html.head(
  ['link', { rel: 'stylesheet', href: 'resources/style/index.css' }]
)
html.body(
  h1('My Start Page'),
  section(
    h2('Devops Tools'),
    table({ id: 'devOpsTools', border: 1, cellPadding: '5px' }, table => {
      const envs = [...new Set(
        devOpsTools
          .map(tool => tool.envs)
          .filter(Boolean)
          .map(envs => Object.keys(envs))
          .reduce((a, n) => [...a, ...n], [])
      )]
      table.tr(td.empty(), tr => tr.mapToHeadings(envs, e => e))
      table.mapToRows(devOpsTools, (tool, row) => {
        const commonUrl = tool.url || ''
        const commonLogoUrl = tool.logoUrl || URL.resolve(commonUrl, '/favicon.ico')
        row.th(tool.name)
        if (tool.envs) {
          row.mapToCells(envs, (env, cell) => {
            const toolEnv = (tool.envs || {})[env] || {}
            const url = URL.resolve(toolEnv.url || '', commonUrl)
            const logoUrl = URL.resolve(url, URL.resolve(toolEnv.logoUrl || '', commonLogoUrl))
            cell.link(url, { title: tool.name }, img({
              src: logoUrl, width: 24, height: 24, alt: `${tool.name} logo`
            }))
          })
        } else {
          row.td({ colspan: envs.length }, link(commonUrl, { title: tool.name }, img({
            src: commonLogoUrl, width: 24, height: 24, alt: `${tool.name} logo`
          })))
        }
      })
    })
  ),
  section(
    h2('BOAR'),
    table(
      { border: 1, cellPadding: '5px' },
      tr(
        th.empty(),
        th({ colspan: 2 }, link(gitlabBaseUrl, gitlabFaviconImg, { title: 'Gitlab' })),
        row => row.mapToHeadings(boarEnvs, env => env.name)
      ),
      table => table.mapToRows(boarApps, (app, row) => {
        const appGitlabGroup = app.gitlabGroup || 'boar'
        const appGitlabPath = app.gitlabPath || app.name
        const appGitlabUrl = app.gitlabUrl || `${gitlabBaseUrl}/${appGitlabGroup}/${appGitlabPath}`
        const appIconUrl = app.iconUrl || `${appGitlabUrl}/avatar`
        row.apply(
          th(app.name),
          td(link(appGitlabUrl, 'repo')),
          td(link(`${appGitlabUrl}/pipelines`), 'pipelines'),
          row => row.mapToCells(boarEnvs, env => link(
            `${env.rootUrl}${app.entryUrl}`,
            { title: `${app.name} in ${env.name}` },
            img({
              src: appIconUrl,
              width: 40,
              height: 40,
              style: `background-color: ${env.color}; padding: 3px`
            })
          ))
        )
      })
    )
  )
)

const htmlString = html.render().toString()
console.log(htmlString)
