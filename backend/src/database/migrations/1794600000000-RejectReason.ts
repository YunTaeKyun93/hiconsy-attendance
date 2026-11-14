import { MigrationInterface, QueryRunner } from "typeorm";

/** 반려 사유(필수 입력). 이 마이그레이션 전에 반려된 건은 NULL로 남는다. */
export class RejectReason1794600000000 implements MigrationInterface {
    name = 'RejectReason1794600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requests" ADD "reject_reason" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requests" DROP COLUMN "reject_reason"`);
    }

}
