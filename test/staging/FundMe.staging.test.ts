import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert } from "chai"
import { network, getNamedAccounts, ethers } from "hardhat"
import { developmentChains } from "../../helper-hardhat-config"
import { FundMe } from "../../typechain"

developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
      let fundMe: FundMe
      const { deployer } = await getNamedAccounts()
      const sendValue = ethers.utils.parseEther("0.1")

      beforeEach(async () => {
        fundMe = await ethers.getContract("FundMe", deployer)
      })

      it("allows people to fund and withdraw", async () => {
        await fundMe.fund({ value: sendValue })
        await fundMe.withdraw()
        const endingBalance = await fundMe.provider.getBalance(fundMe.address)
        assert.equal(endingBalance.toString(), "0")
      })
    })
