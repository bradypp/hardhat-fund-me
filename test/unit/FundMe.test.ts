import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { FundMe, MockV3Aggregator } from "../../typechain"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", () => {
      let fundMe: FundMe
      let mockV3Aggregator: MockV3Aggregator
      let deployer: SignerWithAddress
      const sendValue = ethers.utils.parseEther("1")

      beforeEach(async () => {
        const accounts = await ethers.getSigners()
        deployer = accounts[0]
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe")
        mockV3Aggregator = await ethers.getContract("MockV3Aggregator")
      })

      describe("constructor", () => {
        it("sets the aggregator addresses correctly", async () => {
          const response = await fundMe.getPriceFeed()
          assert.equal(response, mockV3Aggregator.address)
        })
      })

      describe("fund", function () {
        // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
        // could also do assert.fail
        it("Fails if you don't send enough ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          )
        })
        // TODO: make sure exactly $50 works
        it("Updates the amount funded data structure", async () => {
          await fundMe.fund({ value: sendValue })
          const response = await fundMe.getAddressToAmountFunded(
            deployer.address
          )
          assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds funder to array of funders", async () => {
          await fundMe.fund({ value: sendValue })
          const response = await fundMe.getFunder(0)
          assert.equal(response, deployer.address)
        })
      })

      describe("withdraw", function () {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue })
        })

        it("gives a single funder all their ETH back", async () => {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          )
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          )

          // Act
          const transactionResponse = await fundMe.withdraw()
          const transactionReceipt = await transactionResponse.wait()

          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const gasCost = gasUsed.mul(effectiveGasPrice).toString()

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          )
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          )

          // Assert
          assert.equal(endingFundMeBalance.toString(), "0")
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          )
        })
        // this test is overloaded. Ideally we'd split it into multiple tests
        // but for simplicity we left it as one
        it("is allows us to withdraw with multiple funders", async () => {
          // Arrange
          const accounts = await ethers.getSigners()
          for (let i = 1; i < 6; i++) {
            await fundMe.connect(accounts[i]).fund({ value: sendValue })
          }

          // Act
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          )
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          )

          // Let's comapre gas costs :)
          // const transactionResponse = await fundMe.withdraw()
          const transactionResponse = await fundMe.cheaperWithdraw()
          const transactionReceipt = await transactionResponse.wait()

          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
          console.log(`GasCost: ${withdrawGasCost}`)
          console.log(`GasUsed: ${gasUsed}`)
          console.log(`GasPrice: ${effectiveGasPrice}`)

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          )
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer.address
          )
          // Assert
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(withdrawGasCost).toString()
          )
          await expect(fundMe.getFunder(0)).to.be.reverted

          for (let i = 1; i < 6; i++) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            )
          }
        })
        it("only allows the owner to withdraw", async () => {
          const accounts = await ethers.getSigners()
          const fundMeConnectedContract = await fundMe.connect(accounts[1])
          await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          )
        })
      })
    })
