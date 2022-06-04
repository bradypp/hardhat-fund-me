import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { verify } from "../utils/verify"

const deployFundMe: DeployFunction = async ({
  getNamedAccounts,
  deployments,
  network,
}: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const isDevChain = developmentChains.includes(network.name)

  let ethUsdPriceFeedAddress: string
  if (isDevChain) {
    const ethUsdAggregator = await deployments.get("MockV3Aggregator")
    ethUsdPriceFeedAddress = ethUsdAggregator.address
  } else {
    ethUsdPriceFeedAddress = networkConfig[network.name].ethUsdPriceFeed!
  }

  const args = [ethUsdPriceFeedAddress]

  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  })

  log("----------------------------------")

  if (!isDevChain && process.env.ETHERSCAN_API_KEY) {
    await verify(fundMe.address, args)
  }
}

deployFundMe.tags = ["all", "fundMe"]

export default deployFundMe
