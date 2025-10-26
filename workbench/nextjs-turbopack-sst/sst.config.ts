/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: 'nextjs-turbopack-sst',
      removal: 'remove',
      home: 'aws',
    };
  },
  async run() {
    const queue = new sst.aws.Queue('WorkflowQueue');

    const nextjs = new sst.aws.Nextjs('MyWeb', {
      link: [queue],
      environment: {
        WORKFLOW_TARGET_WORLD: '@workflow/world-sst',
        WORKFLOW_SQS_QUEUE_URL: queue.url,
      },
      dev: {
        url: 'http://localhost:3000',
      },
    });

    const schedulerRole = new aws.iam.Role('schedulerRole', {
      assumeRolePolicy: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'scheduler.amazonaws.com',
            },
          },
        ],
      },
    });

    const subscriberLambda = queue.subscribe({
      link: [queue],
      handler: 'aws/queue-subscriber/index.handler',
      environment: {
        WORKFLOW_SERVER_URL: nextjs.url,
        SCHEDULER_ROLE_ARN: schedulerRole.arn,
      },
      permissions: [
        {
          effect: 'allow',
          actions: ['scheduler:CreateSchedule'],
          resources: ['*'],
        },
        {
          effect: 'allow',
          actions: ['iam:PassRole'],
          resources: [schedulerRole.arn],
        },
      ],
    });

    // --- 3. The Permission Policy for the Role ---
    // This policy attaches to the role and grants 'lambda:InvokeFunction'.
    new aws.iam.RolePolicy('schedulerPolicy', {
      role: schedulerRole.name,
      policy: $interpolate`{
      "Version": "2012-10-17",
      "Statement": [{
          "Effect": "Allow",
          "Action": "lambda:InvokeFunction",
          "Resource": "${subscriberLambda.nodes.function.arn}"
      }]
  }`,
    });

    return {
      url: nextjs.url,
    };
  },
});
