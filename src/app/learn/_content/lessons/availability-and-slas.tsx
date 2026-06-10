import {
  Prose,
  LessonSection,
  H3,
  P,
  Term,
  UL,
  LI,
  Callout,
  Analogy,
  CompareTable,
  KeyTakeaways,
  CheckYourself,
  CodeBlock,
} from "@/components/learn";

export default function Lesson() {
  return (
    <Prose>
      <P>
        <Term>Availability</Term> is the percentage of time a system can serve
        successful requests. <Term>Reliability</Term> is whether it behaves
        correctly over time. <Term>SLAs</Term>, <Term>SLOs</Term>, and{" "}
        <Term>SLIs</Term> turn those ideas into measurable promises so teams know
        when the system is healthy, when to slow feature work, and when customers
        are owed remedies.
      </P>

      <Analogy>
        A train station can be open all day, but that only means it is available.
        Reliability means trains depart on the posted schedule, tickets are
        correct, signs point to the right platform, and passengers reach the
        right city. An open station that constantly sends people to the wrong
        train is available but not reliable.
      </Analogy>

      <LessonSection id="problem" title="The problem: downtime is a product feature">
        <P>
          Availability sounds like an operations detail, but it is part of the
          product contract. A payment API that is down blocks revenue. A chat app
          that is down loses trust. A background photo-enhancement feature might
          tolerate hours of downtime with little customer impact. The design must
          match the business consequence.
        </P>
        <CodeBlock label="availability calculation">{`availability = successful time / total time

If a service is down for 45 minutes in a 30-day month:
total minutes = 30 × 24 × 60 = 43,200
available     = 43,200 - 45 = 43,155
availability  = 43,155 / 43,200
              ≈ 99.896%`}</CodeBlock>
        <P>
          Ignoring availability creates a familiar failure mode: one database, one
          region, one queue, one deploy pipeline, or one human approval becomes a
          <Term>single point of failure</Term>. The system works beautifully until
          that one dependency fails.
        </P>
        <Callout type="warning" title="More nines are not free">
          Each extra nine costs money, engineering complexity, testing discipline,
          and operational maturity. Do not promise 99.999% for a feature whose
          users would be fine with 99.9%. Spend reliability budget where failure
          is truly expensive.
        </Callout>
      </LessonSection>

      <LessonSection id="nines" title="The nines: what availability targets allow">
        <P>
          Availability targets are often described as &quot;nines.&quot; Each
          additional nine roughly divides allowed downtime by ten.
        </P>
        <CompareTable
          headers={["Availability", "Common name", "Max downtime / year", "Max downtime / 30-day month"]}
          rows={[
            ["99%", "two nines", "~3.65 days", "~7.2 hours"],
            ["99.9%", "three nines", "~8.76 hours", "~43.2 minutes"],
            ["99.99%", "four nines", "~52.6 minutes", "~4.32 minutes"],
            ["99.999%", "five nines", "~5.26 minutes", "~25.9 seconds"],
          ]}
        />
        <H3>What counts as down?</H3>
        <P>
          This is a product and contract question, not just a monitoring
          question. A service might be considered unavailable when requests return
          5xx, when p99 latency exceeds a threshold, when writes fail but reads
          work, or when a regional subset of customers cannot access it.
        </P>
        <CodeBlock label="example availability SLI">{`good_request =
  HTTP status is not 5xx
  AND latency < 300 ms
  AND response is not a known bad fallback

availability_sli =
  count(good_request) / count(all_eligible_requests)`}</CodeBlock>
      </LessonSection>

      <LessonSection id="sla-slo-sli" title="SLA vs SLO vs SLI">
        <P>
          These three terms form a stack. Start with what you measure, then set
          an internal target, then make a customer-facing promise.
        </P>
        <CompareTable
          headers={["Term", "Meaning", "Audience", "Example"]}
          rows={[
            ["SLI", "Service Level Indicator: the actual metric", "Engineers and dashboards", "99.94% of API requests were successful this week"],
            ["SLO", "Service Level Objective: the internal target", "Product and engineering", "Keep weekly success rate ≥ 99.9%"],
            ["SLA", "Service Level Agreement: the external promise", "Customers and legal contract", "If monthly uptime < 99.5%, customer receives service credits"],
          ]}
        />
        <Callout type="key" title="The promise stack">
          <Term>SLI</Term> is what you measure. <Term>SLO</Term> is what you aim
          for. <Term>SLA</Term> is what you promise externally. Teams usually set
          SLOs stricter than SLAs so they get warning before a contractual breach.
        </Callout>
        <P>
          Real companies use this stack heavily. Google SRE popularized SLOs and
          error budgets. Cloud providers such as AWS, Azure, and Google Cloud
          publish SLAs for services like object storage, virtual machines, and
          managed databases, often with service credits when promises are missed.
        </P>
      </LessonSection>

      <LessonSection id="error-budgets" title="Error budgets: spending unreliability on purpose">
        <P>
          An <Term>error budget</Term> is the amount of failure your SLO permits
          during a window. If your SLO is 99.9% monthly availability, your allowed
          error budget is 0.1% of eligible requests or time. This converts
          reliability from a vague goal into a resource you can spend.
        </P>
        <CodeBlock label="error budget by requests">{`monthly SLO: 99.9% successful requests
monthly traffic: 200,000,000 requests

allowed failures = 0.1% × 200,000,000
                 = 200,000 failed or too-slow requests

If a bad deploy causes 150,000 failed requests,
the team has used 75% of the monthly error budget.`}</CodeBlock>
        <UL>
          <LI>
            If the team is comfortably within budget, it can ship features and
            take controlled risks.
          </LI>
          <LI>
            If the budget is nearly exhausted, reliability work should outrank
            risky launches until the service is healthy again.
          </LI>
          <LI>
            Error budgets create a shared language between product teams that
            want speed and operations teams that want stability.
          </LI>
        </UL>
        <Callout type="tip" title="Budget user pain, not machine pain">
          Prefer SLIs that reflect customer experience: successful checkouts,
          messages sent, search results served, or videos started. CPU at 95% is
          useful debugging data, but it is not itself the user promise.
        </Callout>
      </LessonSection>

      <LessonSection id="math" title="Availability math: series, parallel, MTBF, and MTTR">
        <P>
          Availability of a full request path depends on how components combine.
          Components in <Term>series</Term> all have to work. Components in{" "}
          <Term>parallel</Term> or redundant groups can survive some failures.
        </P>
        <CodeBlock label="series components multiply">{`request path:
client → load balancer → app service → database

If each required component is 99.9% available:
overall = 0.999 × 0.999 × 0.999
        ≈ 0.997
        = 99.7%

Adding required dependencies lowers total availability.`}</CodeBlock>
        <CodeBlock label="parallel redundancy improves availability">{`two independent replicas, either one can serve:
replica availability = 99%
replica failure      = 1% = 0.01

both fail            = 0.01 × 0.01 = 0.0001
group availability   = 1 - 0.0001
                     = 99.99%`}</CodeBlock>
        <CompareTable
          headers={["Shape", "Formula intuition", "Design implication"]}
          rows={[
            ["Series", "A and B and C must all work", "Every mandatory dependency reduces end-to-end availability"],
            ["Parallel / redundant", "A or B can work", "Independent replicas, zones, or failover paths can raise availability"],
            ["Shared dependency", "Replicas depend on the same failing thing", "Redundancy may be fake if all copies share one database, network, or region"],
          ]}
        />
        <P>
          Another common lens is <Term>MTBF</Term> and <Term>MTTR</Term>.{" "}
          <Term>Mean Time Between Failures</Term> estimates how often failures
          occur. <Term>Mean Time To Repair</Term> estimates how long recovery
          takes. Availability improves when failures happen less often or recovery
          gets faster.
        </P>
        <CodeBlock label="MTBF and MTTR">{`availability ≈ MTBF / (MTBF + MTTR)

System A:
  fails every 1,000 hours, recovers in 1 hour
  availability ≈ 1000 / 1001 = 99.90%

System B:
  fails every 1,000 hours, recovers in 5 minutes
  availability ≈ 1000 / 1000.083 = 99.9917%

Fast detection and automated recovery can be as valuable as preventing failures.`}</CodeBlock>
      </LessonSection>

      <LessonSection id="gotchas" title="Edge cases and gotchas">
        <P>
          Availability engineering is full of traps because the math assumes
          independence and clear definitions. Real systems are messier.
        </P>
        <UL>
          <LI>
            <Term>Correlated failures:</Term> two replicas in the same rack,
            region, or software deploy may fail together, so the parallel formula
            overstates availability.
          </LI>
          <LI>
            <Term>Brownouts:</Term> the system is not fully down, but it is so
            slow or degraded that users cannot complete tasks.
          </LI>
          <LI>
            <Term>Maintenance windows:</Term> contracts must specify whether
            planned maintenance counts against the SLA.
          </LI>
          <LI>
            <Term>Partial availability:</Term> reads may work while writes fail,
            one region may be down, or only large customers may be affected.
          </LI>
          <LI>
            <Term>Failover bugs:</Term> a passive standby is only useful if it is
            tested regularly. Untested disaster recovery is hope, not design.
          </LI>
        </UL>
      </LessonSection>

      <KeyTakeaways
        items={[
          "Availability measures successful service over time; reliability means the system behaves correctly when it responds.",
          "The nines translate directly into downtime budgets, and each extra nine costs significant complexity.",
          "SLI is the metric, SLO is the internal target, and SLA is the external promise with consequences.",
          "Error budgets turn reliability into a spendable resource that balances feature velocity and operational risk.",
          "Series dependencies multiply downward; independent parallel redundancy can improve availability, but shared failures break the math.",
        ]}
      />

      <CheckYourself question="Why might a team set an SLO stricter than its SLA?">
        The stricter SLO creates an early warning line. Engineers can investigate
        and slow risky launches before the customer-facing SLA is breached and
        service credits or contractual penalties apply.
      </CheckYourself>

      <CheckYourself question="If two required services are each 99.9% available, is the full path 99.9% available?">
        No. Required services are in series, so their availability multiplies:
        0.999 × 0.999 = 0.998001, or about 99.8%. Every mandatory dependency
        lowers the end-to-end number.
      </CheckYourself>

      <CheckYourself question="What is an error budget used for?">
        It is the allowed amount of unreliability under an SLO. Teams use it to
        decide when they can safely ship changes and when they must prioritize
        reliability work because users have already experienced too much pain.
      </CheckYourself>
    </Prose>
  );
}
