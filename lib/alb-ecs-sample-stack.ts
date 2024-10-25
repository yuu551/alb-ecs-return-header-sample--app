import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";


export class AlbEcsSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appVpc = new ec2.Vpc(this, "AppVpc", {
      maxAzs: 2,
      natGateways: 1,
      ipAddresses: ec2.IpAddresses.cidr("10.1.0.0/16"),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: "Database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });


    const asset = new ecr_assets.DockerImageAsset(this, "CustomImage", {
      directory: "./lib/app", // Dockerfileがあるディレクトリ
    });

    // Fargate Cluster
    const ecsCluster = new ecs.Cluster(this, "FargateCluster", { vpc: appVpc });

    // Fargate Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    taskDefinition.addContainer("web", {
      image: ecs.ContainerImage.fromDockerImageAsset(asset),
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "CustomContainer" }),
    });

    // Fargate Service
    const fargateService = new ecs.FargateService(this, "FargateService", {
      cluster: ecsCluster,
      taskDefinition,
      desiredCount: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: appVpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const listener = alb.addListener("Listener", { port: 80 });
    listener.addTargets("ECS", {
      port: 80,
      targets: [fargateService],
      healthCheck: { path: "/health" },
    });
  }
}
